
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { invokeAdminFunction } from './utils/adminFunctionUtils';
import { UserRole } from './types/userTypes';

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    // Use the edge function to update user role
    await invokeAdminFunction('updateUserRole', { userId, role });
  } catch (error) {
    logger.error('Error in updateUserRole:', error, { module: 'roles' });
    throw error;
  }
}

// Define explicit types to avoid deep type recursion
interface RoleQueryResult {
  data: Array<{ role: string; user_id: string }> | null;
  error: Error | null;
  status: number;
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    // Get the current session
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    
    if (!session?.user) return false;
    
    const userId = session.user.id;
    
    try {
      // Create a query
      const response = await supabase
        .from('user_roles')
        .select('role, user_id')
        .eq('user_id', userId);
      
      // Then explicitly cast the response to our simpler interface
      const { data, error } = response as unknown as RoleQueryResult;
      
      if (error) {
        logger.error('Error checking admin status:', error, { module: 'roles' });
        return false;
      }

      // Check if the user has an admin role
      if (data) {
        const adminRole = data.find(role => role.role === 'admin');
        return !!adminRole;
      }
      
      return false;
    } catch (err) {
      logger.error('Error executing user_roles query:', err, { module: 'roles' });
      return false;
    }
  } catch (error) {
    logger.error('Error in checkIsAdmin:', error, { module: 'roles' });
    return false;
  }
}
