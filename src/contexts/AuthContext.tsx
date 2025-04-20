import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, phone_number?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<any>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing all auth state');
          setSession(null);
          setUser(null);
          setProfile(null);
          localStorage.removeItem('supabase.auth.token');
          ['sb-refresh-token', 'sb-access-token'].forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              console.warn(`Failed to remove ${key} from localStorage:`, e);
            }
          });
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('User authenticated, fetching profile');
            fetchProfile(session.user.id);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'User is authenticated' : 'No active session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string, phone_number?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone_number,
          },
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message,
        });
        throw error;
      }
      
      toast({
        title: "Account created",
        description: "Please check your email to confirm your account.",
      });
    } catch (error: any) {
      console.error('Error during sign up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      setSession(null);
      setUser(null);
      setProfile(null);
      
      localStorage.removeItem('supabase.auth.token');
      ['sb-refresh-token', 'sb-access-token', 'supabase.auth.expires_at', 'supabase.auth.refreshToken'].forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key} from localStorage:`, e);
        }
      });
      
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.startsWith('sb-')) {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove ${key} from localStorage:`, e);
          }
        }
      });
      
      const { error } = await supabase.auth.signOut({
        scope: 'global'
      });
      
      if (error) {
        console.error('Error during sign out API call:', error);
        toast({
          variant: "default",
          title: "Signed out",
          description: "You have been signed out. Some cleanup may happen in the background.",
        });
        
        if (navigator.userAgent.includes('Firefox') && navigator.userAgent.includes('Mobile')) {
          console.log('Firefox Mobile detected, forcing page refresh');
          setTimeout(() => {
            window.location.href = '/';
            window.location.reload();
          }, 500);
        }
      } else {
        console.log('User has been signed out successfully, auth state cleared');
        toast({
          variant: "default",
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      }
    } catch (error: any) {
      console.error('Error during sign out process:', error);
      toast({
        variant: "default",
        title: "Signed out",
        description: "You have been signed out locally. Some cleanup may happen in the background.",
      });
      
      if (navigator.userAgent.includes('Firefox') && navigator.userAgent.includes('Mobile')) {
        console.log('Firefox Mobile detected, forcing page refresh');
        setTimeout(() => {
          window.location.href = '/';
          window.location.reload();
        }, 500);
      }
    }
  };

  const updateProfile = async (data: Partial<any>) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: error.message,
        });
        throw error;
      }

      setProfile({ ...profile, ...data });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
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
    updateProfile,
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
