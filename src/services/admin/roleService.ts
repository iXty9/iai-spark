
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
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return false;
    
    const userId = session.session.user.id;
    
    // Using a type guard to avoid deep type instantiations
    const query = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    // Add additional filter after establishing proper query
    const response = await query.eq('role', 'admin').maybeSingle();

    // Safely access properties with explicit type management
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
