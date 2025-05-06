
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Checks if the current user is an admin
 * @returns A promise resolving to a boolean indicating if the user is admin
 */
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    // If userId is not provided, get the current user from session
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      if (!userId) {
        logger.warn('checkIsAdmin: No user is logged in');
        return false;
      }
    }

    // Query the user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      logger.error('Error checking admin role:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    logger.error('Unexpected error in checkIsAdmin:', error);
    return false;
  }
}
