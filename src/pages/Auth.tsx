
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { getStoredConfig } from '@/config/supabase-config';
import { LogIn, UserPlus, AlertTriangle } from 'lucide-react';

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
  
  // OAuth error handling
  const oauthError = searchParams.get('error');
  const oauthErrorCode = searchParams.get('error_code');
  const oauthErrorDescription = searchParams.get('error_description');
  const hasOAuthError = !!(oauthError || oauthErrorCode);
  
  // Map error codes to user-friendly messages
  const getErrorMessage = () => {
    if (oauthErrorCode === 'bad_oauth_state') {
      return 'Authentication session expired. Please try signing in again.';
    }
    if (oauthErrorDescription) {
      return decodeURIComponent(oauthErrorDescription.replace(/\+/g, ' '));
    }
    if (oauthError) {
      return `Authentication error: ${oauthError}`;
    }
    return 'An error occurred during sign-in. Please try again.';
  };

  // If user is already logged in, redirect to returnTo or home
  // IMPORTANT: Skip redirect when mode === 'reset' - user has an implicit session
  // from the recovery token but needs to stay on page to complete password change
  useEffect(() => {
    if (user && mode !== 'reset') {
      // Sanitize: never follow an off-origin returnTo (open-redirect protection)
      navigate(sanitizeReturnPath(searchParams.get('returnTo'), '/'));
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
  
  // Use sessionStorage to remember the last active tab
  const [activeTab, setActiveTab] = useState(() => {
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
              {/* OAuth Error Alert */}
              {hasOAuthError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Authentication Error</AlertTitle>
                  <AlertDescription>{getErrorMessage()}</AlertDescription>
                </Alert>
              )}
              
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
                  <ResetPasswordForm onBack={() => handleTabChange('login')} />
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
