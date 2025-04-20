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
  } = useAuthState();

  const currentUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing all auth state');
          setSession(null);
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
        } else {
          if (JSON.stringify(newSession) !== JSON.stringify(session)) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user && currentUserIdRef.current !== newSession.user.id) {
              currentUserIdRef.current = newSession.user.id;
              console.log('User authenticated, fetching profile');
              setTimeout(() => {
                fetchProfile(newSession.user.id);
              }, 0);
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('Initial session check:', initialSession ? 'User is authenticated' : 'No active session');
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

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setIsLoading, fetchProfile]);

  const handleUpdateProfile = async (data: Partial<any>) => {
    if (!user) return;
    await updateProfile(supabase, user.id, data);
    setProfile(prev => ({ ...prev, ...data }));
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
