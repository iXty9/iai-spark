
import { createContext, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';

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
  } = useAuthState();

  const currentUserIdRef = useRef<string | null>(null);
  const authStateChanges = useRef<number>(0);
  const initialSessionCheckRef = useRef(false);
  
  // Limit logging for production
  const shouldLog = process.env.NODE_ENV === 'development';
  
  useEffect(() => {
    // Only log in development and limit frequency
    if (shouldLog && authStateChanges.current === 0) {
      console.log('AuthProvider mounted, initializing auth state management');
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        authStateChanges.current++;
        
        // Only log in development and severely limit frequency
        if (shouldLog && authStateChanges.current <= 2) {
          console.log('Auth state changed:', {
            event,
            changeCount: authStateChanges.current,
            hasSession: !!newSession
          });
        }
        
        if (event === 'SIGNED_OUT') {
          if (shouldLog && authStateChanges.current <= 3) {
            console.log('User signed out, clearing auth state');
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
        } else {
          const sessionChanged = JSON.stringify(newSession) !== JSON.stringify(session);
          
          if (sessionChanged) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user && currentUserIdRef.current !== newSession.user.id) {
              currentUserIdRef.current = newSession.user.id;
              
              // Use setTimeout to avoid auth recursion issues
              setTimeout(() => {
                fetchProfile(newSession.user.id);
              }, 0);
            }
          }
        }
      }
    );

    // Initial session check - without console.time/timeEnd
    if (!initialSessionCheckRef.current) {
      initialSessionCheckRef.current = true;
      
      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (error && shouldLog) {
          console.error('Error during initial session check:', error);
        }
        
        if (shouldLog && authStateChanges.current <= 2) {
          console.log('Initial session check:', {
            hasSession: !!initialSession
          });
        }
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          currentUserIdRef.current = initialSession.user.id;
          setTimeout(() => {
            fetchProfile(initialSession.user.id);
          }, 0);
        }
        setIsLoading(false);
      });
    }

    return () => {
      if (shouldLog && authStateChanges.current <= 3) {
        console.log('AuthProvider unmounting, cleaning up subscription');
      }
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setIsLoading, fetchProfile, session, shouldLog]);

  // Debug Effect: Severely limit logging frequency
  useEffect(() => {
    // Only log once at startup in development
    if (shouldLog && !user && !isLoading && authStateChanges.current <= 2) {
      console.log('Auth state initialized:', {
        isLoading,
        hasUser: false
      });
    }
  }, [isLoading, user, shouldLog]);

  const handleUpdateProfile = async (data: Partial<any>) => {
    if (!user) {
      if (shouldLog) {
        console.warn('Attempted to update profile without authenticated user');
      }
      return;
    }
    
    try {
      await updateProfile(supabase, user.id, data);
      setProfile(prev => ({ ...prev, ...data }));
    } catch (error) {
      if (shouldLog) {
        console.error('Profile update failed:', error);
      }
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
    if (process.env.NODE_ENV === 'development') {
      console.error('useAuth hook used outside of AuthProvider context');
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
