
import React from 'react';
import { Navigate } from 'react-router-dom';
import { withSupabase } from '@/services/supabase/connection-service';

export const AdminRequired = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const cleanup = await withSupabase(async (client) => {
          // Check if user is authenticated
          const { data } = await client.auth.getSession();
          setSession(data.session);
          
          // Check if user is admin
          if (data.session?.user?.id) {
            const { data: roleData } = await client
              .from('user_roles')
              .select('*')
              .eq('user_id', data.session.user.id)
              .eq('role', 'admin')
              .single();
              
            setIsAdmin(!!roleData);
          }

          // Set up auth state change listener
          const { data: { subscription } } = client.auth.onAuthStateChange(
            async (_event: any, session: any) => {
              setSession(session);
              
              // Check if user is admin
              if (session?.user?.id) {
                const { data: roleData } = await client
                  .from('user_roles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .eq('role', 'admin')
                  .single();
                  
                setIsAdmin(!!roleData);
              } else {
                setIsAdmin(false);
              }
            }
          );

          // Return cleanup function
          return () => {
            subscription.unsubscribe();
          };
        });
        
        return cleanup;
      } catch (error) {
        console.error("Admin authorization error:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    const adminPromiseResult = checkAdmin();
    
    // Cleanup function for the effect
    return () => {
      // Since we can't directly return the async cleanup, we use a flag approach
      let isCleaned = false;
      adminPromiseResult.then((cleanup) => {
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
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
