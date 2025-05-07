
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './userRolesService';
import { logger } from '@/utils/logging';

/**
 * Checks if a user has a specific role
 * @param userId The user ID to check
 * @param role The role to check for
 * @returns A promise resolving to a boolean indicating if the user has the role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) {
      logger.error('Error checking user role:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    logger.error('Unexpected error in hasRole:', error);
    return false;
  }
}

/**
 * Fetch a user's role from the database
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error fetching user role:', error);
      return null;
    }

    return data && data.length > 0 ? data[0].role : null;
  } catch (error) {
    logger.error('Unexpected error in getUserRole:', error);
    return null;
  }
}

/**
 * Set a user's role in the database
 */
export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    // Check if role entry exists
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error checking existing user role:', error);
      return false;
    }

    let updateResult;
    
    if (data && data.length > 0) {
      // Update
      updateResult = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
    } else {
      // Insert
      updateResult = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
    }

    if (updateResult.error) {
      logger.error('Error setting user role:', updateResult.error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Unexpected error in setUserRole:', error);
    return false;
  }
}
