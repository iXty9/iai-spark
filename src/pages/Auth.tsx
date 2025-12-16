
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
  
  // Robust session detection with retry logic - bypasses proxy timing issues
  useEffect(() => {
    if (mode !== 'reset') return;
    if (sessionCheckRef.current) return; // Prevent double execution
    sessionCheckRef.current = true;
    
    let isSubscribed = true;
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 500; // 500ms between retries
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    
    const checkSession = async (): Promise<boolean> => {
      const client = clientManager.getClient();
      if (!client) {
        logger.info('Client not ready yet, waiting...', { module: 'auth-page' });
        return false;
      }
      
      try {
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) {
          logger.warn('Session check error', error, { module: 'auth-page' });
          return false;
        }
        
        if (session) {
          logger.info('Session found via direct client check', { module: 'auth-page', attempt: retryCount + 1 });
          return true;
        }
        
        return false;
      } catch (err) {
        logger.error('Session check exception', err, { module: 'auth-page' });
        return false;
      }
    };
    
    const handlePKCECode = async (): Promise<boolean> => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (!code) return false;
      
      const client = clientManager.getClient();
      if (!client) return false;
      
      logger.info('PKCE code detected, exchanging for session', { module: 'auth-page' });
      
      try {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        
        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        window.history.replaceState({}, '', cleanUrl.toString());
        
        if (error) {
          logger.error('PKCE code exchange failed', error, { module: 'auth-page' });
          return false;
        }
        
        if (data.session) {
          logger.info('PKCE code exchange successful', { module: 'auth-page' });
          return true;
        }
        
        return false;
      } catch (err) {
        logger.error('PKCE exchange error', err, { module: 'auth-page' });
        return false;
      }
    };
    
    const startSessionDetection = async () => {
      // First, try PKCE code exchange if present
      const pkceSuccess = await handlePKCECode();
      if (pkceSuccess && isSubscribed) {
        setRecoverySessionValid(true);
        return;
      }
      
      // Set up auth state listener as parallel detection method
      const client = clientManager.getClient();
      if (client) {
        const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
          if (!isSubscribed) return;
          
          logger.info('Auth state change detected', { module: 'auth-page', event });
          
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            logger.info('Recovery session established via auth event', { module: 'auth-page', event });
            setRecoverySessionValid(true);
          }
        });
        
        unsubscribeAuth = () => subscription.unsubscribe();
      }
      
      // Start retry loop for session check
      const retryLoop = async () => {
        if (!isSubscribed) return;
        
        const hasSession = await checkSession();
        
        if (hasSession) {
          setRecoverySessionValid(true);
          return;
        }
        
        retryCount++;
        
        if (retryCount < maxRetries) {
          logger.info(`Session check attempt ${retryCount}/${maxRetries} - no session yet`, { module: 'auth-page' });
          retryTimeoutId = setTimeout(retryLoop, retryInterval);
        } else {
          // All retries exhausted - show OTP fallback
          logger.warn('Session detection failed after all retries - showing OTP fallback', { module: 'auth-page' });
          if (isSubscribed) {
            setRecoverySessionValid(false);
          }
        }
      };
      
      // Start the retry loop
      retryLoop();
    };
    
    // Wait briefly for client to be ready, then start detection
    const initTimeout = setTimeout(() => {
      startSessionDetection();
    }, 100);
    
    return () => {
      isSubscribed = false;
      sessionCheckRef.current = false;
      clearTimeout(initTimeout);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [mode]);
  
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
