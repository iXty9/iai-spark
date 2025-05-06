
import { useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

type ProfileResult = { 
  data: any[] | null; 
  error: Error | null;
  status: number;
};

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastError, setLastError] = useState<Error | null>(null);
  const isFetchingProfile = useRef<boolean>(false);
  const fetchAttempts = useRef<number>(0);
  const maxRetries = 3;

  const fetchProfile = async (userId: string) => {
    // Prevent concurrent fetch requests for the same profile
    if (isFetchingProfile.current || !userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Profile fetch skipped:', !userId ? 'No userId provided' : 'Already fetching');
      }
      return;
    }
    
    try {
      isFetchingProfile.current = true;
      fetchAttempts.current++;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching profile attempt', fetchAttempts.current, 'for user:', userId);
      }
      
      // Use a simpler fetch approach to avoid type issues
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId) as unknown as ProfileResult;

      // Handle error case
      if (result.error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Profile fetch error:', {
            error: result.error,
            status: result.status,
            attempt: fetchAttempts.current,
            userId
          });
        }
        
        setLastError(result.error);

        // Retry logic for specific errors
        if (fetchAttempts.current < maxRetries && result.status !== 404) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Scheduling retry...');
          }
          setTimeout(() => {
            fetchProfile(userId);
          }, Math.pow(2, fetchAttempts.current) * 1000); // Exponential backoff
          return;
        }
      }

      // Process the data if it exists
      if (result.data && result.data.length > 0) {
        const profileData = result.data[0];
        
        if (profileData) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Profile fetched successfully:', {
              userId,
              hasData: !!profileData,
              timestamp: new Date().toISOString()
            });
          }
          setProfile(profileData);
          setLastError(null);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('No profile data found for user:', userId);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Unexpected error in fetchProfile:', error);
      }
      setLastError(error as Error);
    } finally {
      isFetchingProfile.current = false;
    }
  };

  return {
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
  };
};
