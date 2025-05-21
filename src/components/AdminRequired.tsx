
import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const AdminRequired = ({ children }: { children: React.ReactNode }) => {
  // Create a local state instead of using useSession hook
  const [session, setSession] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if user is authenticated
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      
      // Check if user is admin
      if (data.session?.user?.id) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.session.user.id)
          .eq('role', 'admin')
          .single();
          
        setIsAdmin(!!roleData);
      }
      
      setLoading(false);
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        
        // Check if user is admin
        if (session?.user?.id) {
          const { data: roleData } = await supabase
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
    
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
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
