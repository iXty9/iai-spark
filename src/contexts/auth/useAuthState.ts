
import { useState, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { debounce } from '@/utils/functions';

// Define explicit types for Supabase responses 
export interface ProfileData {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  theme_settings?: string;
  [key: string]: any;
}

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Use refs to prevent excessive state updates and race conditions
  const isFetchingProfileRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string | null>(null);
  const fetchAttemptsRef = useRef<number>(0);
  const maxRetries = 3;

  // Debounced fetch profile function to prevent multiple rapid calls
  const debouncedFetchProfile = useCallback(
    debounce((userId: string) => {
      fetchProfile(userId);
    }, 300), 
    []
  );

  const fetchProfile = async (userId: string) => {
    // Prevent concurrent fetch requests for the same profile or duplicate fetches
    if (isFetchingProfileRef.current || !userId || currentUserIdRef.current !== userId) {
      logger.debug('Profile fetch skipped', {
        reason: !userId ? 'No userId provided' : 
                isFetchingProfileRef.current ? 'Already fetching' : 
                'User ID changed',
        requestedId: userId,
        currentId: currentUserIdRef.current
      });
      return;
    }
    
    try {
      isFetchingProfileRef.current = true;
      fetchAttemptsRef.current++;
      
      logger.info('Fetching profile', { 
        attempt: fetchAttemptsRef.current, 
        userId 
      }, { module: 'auth', throttle: true });
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Handle error case
      if (error) {
        logger.error('Profile fetch error:', {
          error,
          attempt: fetchAttemptsRef.current,
          userId
        }, { module: 'auth' });
        
        setLastError(error);

        // Retry logic for specific errors, only if user ID hasn't changed
        if (fetchAttemptsRef.current < maxRetries && currentUserIdRef.current === userId) {
          logger.info('Scheduling profile fetch retry', { 
            attempt: fetchAttemptsRef.current,
            userId
          }, { module: 'auth' });
          
          setTimeout(() => {
            // Only retry if the user ID is still the same
            if (currentUserIdRef.current === userId) {
              fetchProfile(userId);
            }
          }, Math.pow(2, fetchAttemptsRef.current) * 1000); // Exponential backoff
          return;
        }
      }

      // Process the data if it exists
      if (data) {
        logger.info('Profile fetched successfully', {
          userId,
          timestamp: new Date().toISOString(),
          hasThemeSettings: !!data.theme_settings
        }, { module: 'auth', throttle: true });
        
        setProfile(data as ProfileData);
        setLastError(null);
        // Reset fetch attempts on success
        fetchAttemptsRef.current = 0;
        
        // Theme initialization is handled by supa-themes service
      } else {
        logger.warn('No profile data found for user', { userId }, { module: 'auth' });
      }
    } catch (error) {
      logger.error('Unexpected error in fetchProfile:', error);
      setLastError(error as Error);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };


  const resetAuthState = useCallback(async () => {
    // Theme reset is handled by supa-themes service
    setSession(null);
    setUser(null);
    setProfile(null);
    setLastError(null);
    currentUserIdRef.current = null;
    fetchAttemptsRef.current = 0;
    isFetchingProfileRef.current = false;
    logger.info('Auth state reset', { module: 'auth' });
  }, []);

  return {
    session,
    setSession,
    user,
    setUser,
    profile,
    setProfile,
    isLoading,
    setIsLoading,
    fetchProfile: debouncedFetchProfile,
    lastError,
    resetAuthState,
    currentUserId: currentUserIdRef,
  };
};
