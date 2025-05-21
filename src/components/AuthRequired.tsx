
import React from 'react';
import { Navigate } from 'react-router-dom';
import { withSupabase } from '@/services/supabase/connection-service';

export const AuthRequired = ({ children }: { children: React.ReactNode }) => {
  // Create a local state instead of using useSession hook
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if user is authenticated
    const checkSession = async () => {
      try {
        const cleanup = await withSupabase(async (client) => {
          const { data } = await client.auth.getSession();
          setSession(data.session);

          // Set up auth state change listener
          const { data: { subscription } } = client.auth.onAuthStateChange(
            (_event: any, session: any) => {
              setSession(session);
            }
          );

          // Return cleanup function
          return () => {
            subscription.unsubscribe();
          };
        });
        
        return cleanup;
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    const authPromiseResult = checkSession();
    
    // Cleanup function for the effect
    return () => {
      // Since we can't directly return the async cleanup, we use a flag approach
      let isCleaned = false;
      authPromiseResult.then((cleanup) => {
        if (typeof cleanup === 'function' && !isCleaned) {
          cleanup();
        }
      });
      isCleaned = true;
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/supabase-auth" />;
  }

  return <>{children}</>;
};
