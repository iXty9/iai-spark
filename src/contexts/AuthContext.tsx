
import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';
import { logger } from '@/utils/logging';
import { bootstrapPhases, BootstrapPhase } from '@/services/bootstrap/bootstrap-phases';
import { clientManager, ClientStatus } from '@/services/supabase/client-manager';
import { ProductionErrorBoundary } from '@/components/error/ProductionErrorBoundary';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
  const systemReadyRef = useRef<boolean>(false);
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // Monitor system readiness (both bootstrap and client)
  useEffect(() => {
    const unsubscribeBootstrap = bootstrapPhases.subscribe((bootstrapState) => {
      const unsubscribeClient = clientManager.subscribe((clientState) => {
        const wasReady = systemReadyRef.current;
        const isReady = bootstrapState.phase === BootstrapPhase.COMPLETE && 
                       clientState.status === ClientStatus.READY && 
                       clientState.client !== null;
        
        systemReadyRef.current = isReady;
        
        // If system just became ready, initialize auth
        if (!wasReady && isReady) {
          logger.info('System ready, initializing auth', { 
            module: 'auth',
            bootstrapPhase: bootstrapState.phase,
            clientStatus: clientState.status
          });
          initializeAuth();
        }
        
        // If system failed, stop loading
        if (bootstrapState.phase === BootstrapPhase.ERROR || 
            clientState.status === ClientStatus.ERROR) {
          logger.warn('System error detected, stopping auth loading', {
            module: 'auth',
            bootstrapPhase: bootstrapState.phase,
            clientStatus: clientState.status,
            bootstrapError: bootstrapState.error,
            clientError: clientState.error
          });
          setIsLoading(false);
        }
        
        // If needs setup, stop loading
        if (bootstrapState.phase === BootstrapPhase.NEEDS_SETUP) {
          setIsLoading(false);
        }
      });
      
      return unsubscribeClient;
    });
    
    return unsubscribeBootstrap;
  }, []);

  // Initialize auth when system is ready
  const initializeAuth = () => {
    // Double-check system readiness
    const clientState = clientManager.getState();
    const bootstrapState = bootstrapPhases.getState();
    
    if (clientState.status !== ClientStatus.READY || 
        !clientState.client || 
        bootstrapState.phase !== BootstrapPhase.COMPLETE) {
      logger.warn('Auth initialization called but system not ready', { 
        module: 'auth',
        clientStatus: clientState.status,
        bootstrapPhase: bootstrapState.phase,
        hasClient: !!clientState.client
      });
      setIsLoading(false);
      return;
    }

    try {
      // Clean up existing subscription
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }

      // Set up auth state change listener with error handling
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
              resetAuthState();
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

      // Initial session check - only once per system initialization
      if (!initialSessionCheckRef.current) {
        initialSessionCheckRef.current = true;
        
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
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
            }, 0);
          }
          setIsLoading(false);
        }).catch((error) => {
          logger.error('Error during initial session check', error, { module: 'auth' });
          setIsLoading(false);
        });
      }
    } catch (error) {
      logger.error('Error setting up auth state', error, { module: 'auth' });
      setIsLoading(false);
    }
  };

  // Reset when system is reset
  useEffect(() => {
    const unsubscribe = bootstrapPhases.subscribe((state) => {
      if (state.phase === BootstrapPhase.NOT_STARTED) {
        // System is being reset, clean up auth
        if (authSubscriptionRef.current) {
          try {
            authSubscriptionRef.current.unsubscribe();
          } catch (error) {
            logger.error('Error unsubscribing during reset', error, { module: 'auth' });
          }
          authSubscriptionRef.current = null;
        }
        initialSessionCheckRef.current = false;
        resetAuthState();
        setIsLoading(true);
      }
    });
    
    return unsubscribe;
  }, [resetAuthState, setIsLoading]);

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
