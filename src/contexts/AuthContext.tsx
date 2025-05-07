
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
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // Set up auth state listener and cleanup on unmount
  useEffect(() => {
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
    }

    // Cleanup subscription on unmount
    return () => {
      if (shouldLog) {
        logger.info('AuthProvider unmounting, cleaning up subscription', 
          null, { module: 'auth' });
      }
      
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
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
