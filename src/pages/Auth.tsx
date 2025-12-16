
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { getStoredConfig } from '@/config/supabase-config';
import { LogIn, UserPlus } from 'lucide-react';
import { clientManager } from '@/services/supabase/client-manager';
import { logger } from '@/utils/logging';

// Brute force protection - track failed login attempts
const loginAttempts = {
  count: 0,
  lastAttemptTime: 0,
  ipAddress: '',
  reset() {
    this.count = 0;
    this.lastAttemptTime = 0;
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  // Recovery session state - managed at parent level to catch early events
  const [recoverySessionValid, setRecoverySessionValid] = useState<boolean | null>(null);
  const sessionCheckRef = useRef<boolean>(false);

  // If user is already logged in, redirect to returnTo or home
  // IMPORTANT: Skip redirect when mode === 'reset' - user has an implicit session
  // from the recovery token but needs to stay on page to complete password change
  useEffect(() => {
    if (user && mode !== 'reset') {
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || '/');
    }
    
    // Reset login attempts counter when component mounts
    loginAttempts.reset();
    
    // Log connection info for debugging
    if (process.env.NODE_ENV === 'development') {
      try {
        const storedConfig = getStoredConfig();
        const connectionId = localStorage.getItem('supabase_connection_id') || 'unknown';
        
        console.log('Auth page connection info:', { 
          connectionId,
          url: storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config',
          hostname: window.location.hostname
        });
      } catch (e) {
        console.error('Error retrieving connection info:', e);
      }
    }
    
    // Optional: Get approximate user location based on IP for logging
    const fetchClientInfo = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        loginAttempts.ipAddress = data.ip;
      } catch (error) {
        // Non-critical, just fail silently
        console.log('Could not get IP info');
      }
    };
    
    if (process.env.NODE_ENV === 'production') {
      fetchClientInfo();
    }
    
  }, [user, navigate, mode, searchParams]);
  
  // Event-driven session detection - waits for detectSessionInUrl to process URL hash
  useEffect(() => {
    if (mode !== 'reset') return;
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    let isSubscribed = true;
    let unsubscribeAuth: (() => void) | null = null;
    let overallTimeoutId: NodeJS.Timeout | null = null;

    const startSessionDetection = async () => {
      // Wait for client manager to be fully ready
      const isReady = await clientManager.waitForReadiness();
      if (!isReady || !isSubscribed) {
        logger.warn('Client not ready for session detection', { module: 'auth-page' });
        setRecoverySessionValid(false);
        return;
      }

      const client = clientManager.getClient();
      if (!client || !isSubscribed) {
        logger.warn('No client available for session detection', { module: 'auth-page' });
        setRecoverySessionValid(false);
        return;
      }

      logger.info('Starting password recovery session detection', { module: 'auth-page' });

      // 1. Set up auth state listener FIRST - this catches PASSWORD_RECOVERY event 
      // fired when Supabase's detectSessionInUrl processes the URL hash fragment
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!isSubscribed) return;
        
        logger.info('Auth state change in reset mode', { module: 'auth-page', event, hasSession: !!session });
        
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session) {
            logger.info('Recovery session detected via auth event', { module: 'auth-page', event });
            if (overallTimeoutId) clearTimeout(overallTimeoutId);
            setRecoverySessionValid(true);
          }
        }
      });
      unsubscribeAuth = () => subscription.unsubscribe();

      // 2. Handle PKCE code if present in URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        logger.info('PKCE code detected, exchanging for session', { module: 'auth-page' });
        try {
          const { data, error } = await client.auth.exchangeCodeForSession(code);
          
          // Clean up URL
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('code');
          window.history.replaceState({}, '', cleanUrl.toString());
          
          if (!error && data.session && isSubscribed) {
            logger.info('PKCE code exchange successful', { module: 'auth-page' });
            if (overallTimeoutId) clearTimeout(overallTimeoutId);
            setRecoverySessionValid(true);
            return;
          }
        } catch (err) {
          logger.error('PKCE exchange error', err, { module: 'auth-page' });
        }
      }

      // 3. Check if session ALREADY exists (detectSessionInUrl may have already processed)
      try {
        const { data: { session } } = await client.auth.getSession();
        
        if (session && isSubscribed) {
          logger.info('Recovery session already exists', { module: 'auth-page' });
          if (overallTimeoutId) clearTimeout(overallTimeoutId);
          setRecoverySessionValid(true);
          return;
        }
      } catch (err) {
        logger.error('Session check error', err, { module: 'auth-page' });
      }

      // 4. Set overall timeout - if no session after 20 seconds, show OTP fallback
      // This is a genuine fallback for expired/invalid links, not a timing failure
      overallTimeoutId = setTimeout(() => {
        if (isSubscribed && recoverySessionValid === null) {
          logger.warn('Session detection timed out after 20 seconds - showing OTP fallback', { module: 'auth-page' });
          setRecoverySessionValid(false);
        }
      }, 20000);
    };

    startSessionDetection();

    return () => {
      isSubscribed = false;
      sessionCheckRef.current = false;
      if (overallTimeoutId) clearTimeout(overallTimeoutId);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [mode, recoverySessionValid]);
  
  // Use sessionStorage to remember the last active tab
  const [activeTab, setActiveTab] = React.useState(() => {
    if (mode === 'reset') return 'reset';
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authTab') || 'login';
    }
    return 'login';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authTab', value);
    }
  };

  // Handle PASSWORD_RECOVERY event to switch to reset tab
  useEffect(() => {
    const client = clientManager.getClient();
    if (!client) return;
    
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        logger.info('Password recovery event - switching to reset tab', { module: 'auth-page' });
        setActiveTab('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <AuthCard>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Desktop Tabs */}
                {activeTab !== 'forgot' && activeTab !== 'reset' && (
                  <div className="hidden sm:block">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30 p-1 rounded-lg">
                      <TabsTrigger 
                        value="login"
                        className="flex items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Sign In</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="register"
                        className="flex items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Register</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                )}

                {/* Mobile Dropdown */}
                {activeTab !== 'forgot' && activeTab !== 'reset' && (
                  <div className="sm:hidden mb-6">
                    <Select value={activeTab} onValueChange={handleTabChange}>
                      <SelectTrigger className="w-full h-11 bg-muted/30 border-border/50">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {activeTab === "login" && (
                              <>
                                <LogIn className="h-4 w-4" />
                                <span>Sign In</span>
                              </>
                            )}
                            {activeTab === "register" && (
                              <>
                                <UserPlus className="h-4 w-4" />
                                <span>Create Account</span>
                              </>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="login">
                          <div className="flex items-center gap-2">
                            <LogIn className="h-4 w-4" />
                            <span>Sign In</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="register">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            <span>Create Account</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {activeTab === 'forgot' ? (
                  <ForgotPasswordForm onBack={() => handleTabChange('login')} />
                ) : activeTab === 'reset' ? (
                  <ResetPasswordForm 
                    sessionValid={recoverySessionValid}
                    onBack={() => handleTabChange('login')}
                  />
                ) : (
                  <>
                    <TabsContent value="login" className="mt-0">
                      <LoginForm />
                    </TabsContent>
                    
                    <TabsContent value="register" className="mt-0">
                      <RegisterForm />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </AuthCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
