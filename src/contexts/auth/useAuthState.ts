
import { useEffect, useState, useRef } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { eventBus, AppEvents } from '@/utils/event-bus';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const authListenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Initialize the client
        const client = await supabase;
        if (!client) {
          setError('Supabase client not available');
          setLoading(false);
          return;
        }
        
        // Get the current session
        const { data, error } = await client.auth.getSession();
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        
        // Set the user if we have a session
        setUser(data.session?.user ?? null);
        
        // Subscribe to auth changes
        const { data: listener } = client.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session) => {
            logger.debug('Auth state changed', { event });
            setUser(session?.user ?? null);
            
            // Publish auth events to the event bus
            if (event === 'SIGNED_IN') {
              eventBus.publish(AppEvents.USER_SIGNED_IN, { user: session?.user });
              
              // Try to ensure the user has a profile
              try {
                if (session?.user?.id) {
                  const { error: profileError } = await client
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();
                    
                  // If the profile doesn't exist, create it
                  if (profileError && profileError.code === 'PGRST116') {
                    await client.from('profiles').insert({
                      id: session.user.id,
                      username: session.user.email || session.user.id,
                      updated_at: new Date().toISOString()
                    });
                  }
                }
              } catch (err) {
                logger.error('Error ensuring user profile exists', err);
              }
            } else if (event === 'SIGNED_OUT') {
              eventBus.publish(AppEvents.USER_SIGNED_OUT, {});
            } else if (event === 'USER_UPDATED') {
              eventBus.publish(AppEvents.USER_UPDATED, { user: session?.user });
            }
          }
        );
        
        // Save the listener for cleanup
        authListenerRef.current = listener;
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error');
        logger.error('Auth initialization error', err);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Cleanup on component unmount
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, []);

  return { user, loading, error };
}
