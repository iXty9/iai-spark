
import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';
import { logger } from '@/utils/logging';
import { bootstrapPhases, BootstrapPhase } from '@/services/bootstrap/bootstrap-phases';
import { clientManager, ClientStatus } from '@/services/supabase/client-manager';

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
  const bootstrapReadyRef = useRef<boolean>(false);
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // Wait for bootstrap to complete before initializing auth
  useEffect(() => {
    const unsubscribe = bootstrapPhases.subscribe((state) => {
      const wasReady = bootstrapReadyRef.current;
      bootstrapReadyRef.current = state.phase === BootstrapPhase.COMPLETE;
      
      // If bootstrap just became ready, initialize auth
      if (!wasReady && bootstrapReadyRef.current) {
        logger.info('Bootstrap completed, initializing auth', { module: 'auth' });
        initializeAuth();
      }
      
      // If bootstrap failed or needs setup, stop loading
      if (state.phase === BootstrapPhase.ERROR || state.phase === BootstrapPhase.NEEDS_SETUP) {
        setIsLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  // Initialize auth when bootstrap is ready
  const initializeAuth = () => {
    // Check if client is ready
    const clientState = clientManager.getState();
    if (clientState.status !== ClientStatus.READY || !clientState.client) {
      logger.warn('Client not ready for auth initialization', { 
        module: 'auth',
        clientStatus: clientState.status 
      });
      setIsLoading(false);
      return;
    }

    try {
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
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
          } else {
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
        }
      );

      // Store subscription for cleanup
      authSubscriptionRef.current = subscription;

      // Initial session check - only once
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
        });
      }
    } catch (error) {
      logger.error('Error setting up auth state', error, { module: 'auth' });
      setIsLoading(false);
    }
  };

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

  // Handle profile updates
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    logger.error('useAuth hook used outside of AuthProvider context', null, { module: 'auth' });
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
