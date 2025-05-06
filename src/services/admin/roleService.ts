
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

export async function checkIsAdmin(): Promise<boolean> {
  try {
    // Get the current session
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    
    if (!session?.user) return false;
    
    const userId = session.user.id;
    
    // Simplify query to avoid deep type instantiations
    let response;
    try {
      // Simple query approach
      response = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
    } catch (err) {
      logger.error('Error executing user_roles query:', err, { module: 'roles' });
      return false;
    }
    
    // Safely access properties
    const error = response?.error;
    const data = response?.data;

    if (error) {
      logger.error('Error checking admin status:', error, { module: 'roles' });
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error in checkIsAdmin:', error, { module: 'roles' });
    return false;
  }
}
