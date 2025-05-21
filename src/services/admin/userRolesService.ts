
import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';
import { UserRole } from './types/userTypes';

/**
 * Update a user's role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      const { error } = await client
        .from('user_roles')
        .upsert(
          { user_id: userId, role },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );
      
      if (error) {
        logger.error('Failed to update user role', error);
        return false;
      }
      
      return true;
    });
  } catch (error) {
    logger.error('Error updating user role', error);
    return false;
  }
}

/**
 * Get a user's role
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.role as UserRole;
    });
  } catch (error) {
    logger.error('Error getting user role', error);
    return null;
  }
}

/**
 * Check if a user has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId);
    return role === 'admin';
  } catch (error) {
    logger.error('Error checking if user is admin', error);
    return false;
  }
}
