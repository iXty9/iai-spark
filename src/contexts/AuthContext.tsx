
import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';
import { logger } from '@/utils/logging';
import { clientManager } from '@/services/supabase/client-manager';
import { ProductionErrorBoundary } from '@/components/error/ProductionErrorBoundary';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  clientReady: boolean;
}

export const AuthProvider = ({ children, clientReady }: AuthProviderProps) => {
  const {
    session,
    setSession,
    user,
    setUser,
    profile,
    setProfile,
    isLoading,
    setIsLoading,
    fetchProfile,
    lastError,
    resetAuthState,
    currentUserId
  } = useAuthState();

  const authStateChanges = useRef<number>(0);
  const initialSessionCheckRef = useRef(false);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // Initialize auth when client becomes ready
  useEffect(() => {
    if (!clientReady) {
      logger.info('Client not ready, waiting for initialization', { module: 'auth' });
      setIsLoading(true);
      return;
    }

    initializeAuth();
  }, [clientReady]);

  // Set up real-time subscription for profile changes (cross-browser sync)
  useEffect(() => {
    if (!clientReady || !user?.id) return;

    const channel = supabase
      .channel(`profile_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          try {
            // PHASE 4: Enhanced real-time cross-browser sync
            if (payload.new?.theme_settings) {
              logger.info('Received real-time theme update from another browser', { 
                module: 'auth',
                userId: user.id,
                settingsChanged: payload.new.theme_settings !== profile?.theme_settings
              });
              
              // Always update local profile state
              setProfile(prev => prev ? { ...prev, ...payload.new } : null);
              
              // Apply theme changes from other browsers (handled by supa-themes service)
              logger.info('Theme synced from real-time update', { module: 'auth' });
            }
          } catch (error) {
            logger.error('Error handling real-time profile update:', error, { module: 'auth' });
          }
        }
      )
      .subscribe();

    return () => {
      if (shouldLog) {
        logger.info('Cleaning up real-time profile subscription', null, { module: 'auth' });
      }
      supabase.removeChannel(channel);
    };
  }, [clientReady, user?.id, profile?.theme_settings]);

  // Initialize auth when client is ready
  const initializeAuth = async () => {
    try {
      logger.info('Initializing auth with ready client', { module: 'auth' });

      // Clean up existing subscription
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }

      // Wait for client to be fully ready
      const isReady = await clientManager.waitForReadiness();
      if (!isReady) {
        throw new Error('Client failed to become ready');
      }

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          try {
            authStateChanges.current++;
            
            if (shouldLog) {
              logger.info('Auth state changed', {
                event,
                changeCount: authStateChanges.current,
                hasSession: !!newSession,
                userId: newSession?.user?.id,
              }, { module: 'auth', throttle: true });
            }
            
            if (event === 'SIGNED_OUT') {
              logger.info('User signed out, clearing auth state', null, { module: 'auth' });
              
              // Use setTimeout to prevent auth state thrashing and theme re-applications
              setTimeout(() => {
                resetAuthState().catch(error => {
                  logger.error('Error during auth state reset on signout:', error, { module: 'auth' });
                });
                // Clear notification service user ID
                import('@/services/notification-service').then(({ notificationService }) => {
                  notificationService.setUserId(null);
                });
              }, 0);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              const sessionChanged = JSON.stringify(newSession) !== JSON.stringify(session);
              
              if (sessionChanged) {
                setSession(newSession);
                setUser(newSession?.user ?? null);
                
                if (newSession?.user && currentUserId.current !== newSession.user.id) {
                  currentUserId.current = newSession.user.id;
                  
                  // Use setTimeout to avoid auth recursion issues
                  setTimeout(() => {
                    fetchProfile(newSession.user.id);
                    // Update notification service with new user ID
                    import('@/services/notification-service').then(({ notificationService }) => {
                      notificationService.setUserId(newSession.user.id);
                    });
                  }, 0);
                }
              }
            }
          } catch (error) {
            logger.error('Error in auth state change handler', error, { module: 'auth' });
          }
        }
      );

      // Store subscription for cleanup
      authSubscriptionRef.current = subscription;

      // Initial session check - only once per client initialization
      if (!initialSessionCheckRef.current) {
        initialSessionCheckRef.current = true;
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error during initial session check:', error);
        }
        
        if (shouldLog) {
          logger.info('Initial session check', {
            hasSession: !!initialSession,
            userId: initialSession?.user?.id,
          }, { module: 'auth' });
        }
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          currentUserId.current = initialSession.user.id;
          setTimeout(() => {
            fetchProfile(initialSession.user.id);
            // Initialize notification service with user ID
            import('@/services/notification-service').then(({ notificationService }) => {
              notificationService.setUserId(initialSession.user.id);
            });
          }, 0);
        }
        setIsLoading(false);
      }
    } catch (error) {
      logger.error('Error setting up auth state', error, { module: 'auth' });
      setIsLoading(false);
    }
  };

  // Reset when client is reset
  useEffect(() => {
    if (!clientReady) {
      // Client is being reset, clean up auth
      if (authSubscriptionRef.current) {
        try {
          authSubscriptionRef.current.unsubscribe();
        } catch (error) {
          logger.error('Error unsubscribing during reset', error, { module: 'auth' });
        }
        authSubscriptionRef.current = null;
      }
      initialSessionCheckRef.current = false;
      resetAuthState().catch(error => {
        logger.error('Error during auth state reset on client reset:', error, { module: 'auth' });
      });
      setIsLoading(true);
    }
  }, [clientReady, resetAuthState, setIsLoading]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (shouldLog) {
        logger.info('AuthProvider unmounting, cleaning up subscription', 
          null, { module: 'auth' });
      }
      
      if (authSubscriptionRef.current) {
        try {
          authSubscriptionRef.current.unsubscribe();
        } catch (error) {
          logger.error('Error unsubscribing from auth state', error, { module: 'auth' });
        }
        authSubscriptionRef.current = null;
      }
    };
  }, []);

  // Handle profile updates with error handling
  const handleUpdateProfile = async (data: Partial<any>) => {
    if (!user) {
      logger.warn('Attempted to update profile without authenticated user', null, { module: 'auth' });
      return;
    }
    
    try {
      await updateProfile(supabase, user.id, data);
      // Update local state with new profile data
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      // Theme updates are handled by supa-themes service automatically
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile: handleUpdateProfile,
  };

  return (
    <ProductionErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-600">There was a problem with the authentication system.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    }>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </ProductionErrorBoundary>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    logger.error('useAuth hook used outside of AuthProvider context', null, { module: 'auth' });
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
