
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import { isUserAdmin } from '../services/admin/userRolesService';

export const AdminRequired = ({ children }: { children: React.ReactNode }) => {
  const session = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (session?.user?.id) {
        try {
          const admin = await isUserAdmin(session.user.id);
          setIsAdmin(admin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    }

    checkAdmin();
  }, [session]);

  if (loading) {
    return <div>Checking permissions...</div>;
  }

  if (!session) {
    return <Navigate to="/supabase-auth" />;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
