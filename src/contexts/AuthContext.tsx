
import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';
import { logger } from '@/utils/logging';

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
  const clientAvailableRef = useRef<boolean>(false);
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // First, check if Supabase client is valid before proceeding with auth setup
  useEffect(() => {
    // Check if Supabase client is available and properly initialized
    const checkClientAvailability = () => {
      try {
        // Safely check if client exists and has necessary properties
        if (supabase && typeof supabase === 'object' && supabase.auth) {
          clientAvailableRef.current = true;
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Error checking Supabase client availability', error, { module: 'auth' });
        return false;
      }
    };
    
    // Try to check availability immediately
    const isAvailable = checkClientAvailability();
    
    // If not available immediately, set up retry mechanism
    if (!isAvailable) {
      logger.warn('Supabase client not immediately available, will retry', null, { module: 'auth' });
      
      // Set up retry interval (every 500ms)
      const retryInterval = setInterval(() => {
        const retryResult = checkClientAvailability();
        
        if (retryResult) {
          logger.info('Supabase client became available', null, { module: 'auth' });
          clearInterval(retryInterval);
        }
      }, 500);
      
      // Clean up interval on unmount
      return () => {
        clearInterval(retryInterval);
      };
    }
  }, []);

  // Set up auth state listener and cleanup on unmount - only when client is available
  useEffect(() => {
    // Skip if client isn't available
    if (!clientAvailableRef.current) {
      return;
    }
    
    // Create connection ID for debugging if it doesn't exist
    if (!localStorage.getItem('supabase_connection_id')) {
      localStorage.setItem('supabase_connection_id', `conn_${Date.now().toString(36)}`);
    }
    
    // Get connection ID to log along with auth events
    const connectionId = localStorage.getItem('supabase_connection_id') || 'unknown';
    
    // Only log in development 
    if (shouldLog) {
      logger.info('AuthProvider mounted', { 
        connectionId 
      }, { module: 'auth' });
    }
    
    try {
      // Set up auth state change listener with safeguards
      if (supabase && supabase.auth) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            authStateChanges.current++;
            
            if (shouldLog) {
              logger.info('Auth state changed', {
                event,
                changeCount: authStateChanges.current,
                hasSession: !!newSession,
                userId: newSession?.user?.id,
                connectionId
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
      } else {
        logger.warn('Supabase auth not available for subscription', null, { module: 'auth' });
      }

      // Initial session check - only once
      if (!initialSessionCheckRef.current && supabase && supabase.auth) {
        initialSessionCheckRef.current = true;
        
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
          if (error) {
            logger.error('Error during initial session check:', error);
          }
          
          if (shouldLog) {
            logger.info('Initial session check', {
              hasSession: !!initialSession,
              userId: initialSession?.user?.id,
              connectionId
            }, { module: 'auth' });
          }
          
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            currentUserId.current = initialSession.user.id;
            // Use setTimeout to avoid auth recursion issues
            setTimeout(() => {
              fetchProfile(initialSession.user.id);
            }, 0);
          }
          setIsLoading(false);
        });
      } else {
        // If we can't check session, still mark as not loading to allow UI to render
        setIsLoading(false);
      }
    } catch (error) {
      logger.error('Error setting up auth state', error, { module: 'auth' });
      setIsLoading(false);
    }

    // Cleanup subscription on unmount
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
  }, [
    setSession, 
    setUser, 
    setProfile, 
    setIsLoading, 
    fetchProfile, 
    session, 
    shouldLog,
    resetAuthState, 
    currentUserId
  ]);

  // Debug log for initial auth state
  useEffect(() => {
    if (shouldLog && !isLoading) {
      const connectionId = localStorage.getItem('supabase_connection_id') || 'unknown';
      logger.info('Auth state initialized', {
        isLoading,
        hasUser: !!user,
        userId: user?.id,
        connectionId
      }, { module: 'auth', once: true });
    }
  }, [isLoading, user, shouldLog]);

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
