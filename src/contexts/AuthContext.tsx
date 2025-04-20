
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
  
  useEffect(() => {
    console.log('AuthProvider mounted, initializing auth state management');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        authStateChanges.current++;
        console.log('Auth state changed:', {
          event,
          timestamp: new Date().toISOString(),
          changeCount: authStateChanges.current,
          hasSession: !!newSession,
          currentUserId: currentUserIdRef.current,
          newUserId: newSession?.user?.id
        });
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing auth state');
          setSession(null);
          setUser(null);
          setProfile(null);
          currentUserIdRef.current = null;
        } else {
          const sessionChanged = JSON.stringify(newSession) !== JSON.stringify(session);
          console.log('Session comparison:', {
            changed: sessionChanged,
            event
          });

          if (sessionChanged) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user && currentUserIdRef.current !== newSession.user.id) {
              currentUserIdRef.current = newSession.user.id;
              console.log('User authenticated, scheduling profile fetch');
              setTimeout(() => {
                fetchProfile(newSession.user.id);
              }, 0);
            }
          }
        }
      }
    );

    // Initial session check
    console.time('initialSessionCheck');
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      console.timeEnd('initialSessionCheck');
      
      if (error) {
        console.error('Error during initial session check:', error);
      }
      
      console.log('Initial session check:', {
        hasSession: !!initialSession,
        timestamp: new Date().toISOString(),
        error: error?.message
      });
      
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
      console.log('AuthProvider unmounting, cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setIsLoading, fetchProfile]);

  // Debug Effect: Log state changes
  useEffect(() => {
    console.log('Auth state updated:', {
      timestamp: new Date().toISOString(),
      isLoading,
      hasUser: !!user,
      hasSession: !!session,
      hasProfile: !!profile,
      lastError: lastError?.message
    });
  }, [isLoading, user, session, profile, lastError]);

  const handleUpdateProfile = async (data: Partial<any>) => {
    if (!user) {
      console.warn('Attempted to update profile without authenticated user');
      return;
    }
    
    try {
      console.log('Updating profile:', {
        userId: user.id,
        updateData: data,
        timestamp: new Date().toISOString()
      });
      
      await updateProfile(supabase, user.id, data);
      setProfile(prev => ({ ...prev, ...data }));
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
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
    console.error('useAuth hook used outside of AuthProvider context');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
