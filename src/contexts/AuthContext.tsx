
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/services/supabase/client-provider';
import { AuthContextType } from './auth/types';
import { signIn, signUp, signOut, updateProfile } from './auth/authOperations';
import { logger } from '@/utils/logging';
import { eventBus, AppEvents } from '@/utils/event-bus';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Refs for tracking state
  const authStateChanges = useRef<number>(0);
  const initialSessionCheckRef = useRef(false);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const currentUserId = useRef<string | null>(null);
  const supabaseReadyRef = useRef<boolean>(false);
  
  // Reset auth state
  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    currentUserId.current = null;
  };
  
  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const client = await getSupabaseClient();
      if (!client) {
        logger.error('Supabase client not available when fetching profile', null, { module: 'auth' });
        return;
      }
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        logger.error('Error fetching profile:', error, { module: 'auth' });
        return;
      }
      
      if (data) {
        setProfile(data);
      } else {
        logger.warn('No profile found for user', { userId }, { module: 'auth' });
      }
    } catch (error) {
      logger.error('Unexpected error fetching profile:', error, { module: 'auth' });
    }
  };
  
  // Listen for client initialization
  useEffect(() => {
    const clientInitSubscription = eventBus.subscribe(AppEvents.CLIENT_INITIALIZED, async () => {
      logger.info('Supabase client initialized, setting up auth', null, { module: 'auth' });
      supabaseReadyRef.current = true;
      
      try {
        const client = await getSupabaseClient();
        if (!client) {
          logger.error('Supabase client not available after initialization event', null, { module: 'auth' });
          setIsLoading(false);
          return;
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = client.auth.onAuthStateChange(
          (event, newSession) => {
            authStateChanges.current++;
            
            logger.info('Auth state changed', {
              event,
              changeCount: authStateChanges.current,
              hasSession: !!newSession,
              userId: newSession?.user?.id,
              connectionId: localStorage.getItem('supabase_connection_id') || 'unknown'
            }, { module: 'auth', throttle: true });
            
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
          
          const { data: { session: initialSession }, error } = await client.auth.getSession();
          
          if (error) {
            logger.error('Error during initial session check:', error, { module: 'auth' });
          }
          
          logger.info('Initial session check', {
            hasSession: !!initialSession,
            userId: initialSession?.user?.id,
            connectionId: localStorage.getItem('supabase_connection_id') || 'unknown'
          }, { module: 'auth' });
          
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            currentUserId.current = initialSession.user.id;
            // Use setTimeout to avoid auth recursion issues
            setTimeout(() => {
              fetchProfile(initialSession.user.id);
            }, 0);
          }
        }
        
        // Auth is ready
        setIsLoading(false);
        eventBus.publish(AppEvents.AUTH_INITIALIZED, { timestamp: new Date().toISOString() });
      } catch (error) {
        logger.error('Error setting up auth state', error, { module: 'auth' });
        setIsLoading(false);
      }
    });
    
    // Check if client is already ready
    getSupabaseClient().then(client => {
      if (client) {
        supabaseReadyRef.current = true;
        eventBus.publish(AppEvents.CLIENT_INITIALIZED, { timestamp: new Date().toISOString() });
      } else {
        // If we reached this point and still don't have a client after a while, 
        // reset loading state to prevent UI from hanging
        setTimeout(() => {
          if (isLoading) {
            logger.warn('Auth still loading after timeout, forcing state change', null, { module: 'auth' });
            setIsLoading(false);
          }
        }, 5000);
      }
    });
    
    // Client error handling
    const clientErrorSubscription = eventBus.subscribe(AppEvents.CLIENT_ERROR, () => {
      // On client error, reset auth state if we were previously ready
      if (supabaseReadyRef.current) {
        logger.warn('Client error detected, resetting auth state', null, { module: 'auth' });
        resetAuthState();
        supabaseReadyRef.current = false;
      }
    });
    
    // Cleanup subscription on unmount
    return () => {
      clientInitSubscription.unsubscribe();
      clientErrorSubscription.unsubscribe();
      
      if (authSubscriptionRef.current) {
        try {
          authSubscriptionRef.current.unsubscribe();
        } catch (error) {
          logger.error('Error unsubscribing from auth state', error, { module: 'auth' });
        }
        authSubscriptionRef.current = null;
      }
    };
  }, [isLoading, session]);

  // Handle profile updates
  const handleUpdateProfile = async (data: Partial<any>) => {
    if (!user) {
      logger.warn('Attempted to update profile without authenticated user', null, { module: 'auth' });
      return;
    }
    
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Supabase client not available');
      
      await updateProfile(client, user.id, data);
      // Update local state with new profile data
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      logger.error('Profile update failed:', error, { module: 'auth' });
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
