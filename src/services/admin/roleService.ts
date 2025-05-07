
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types/userTypes';
import { logger } from '@/utils/logging';

/**
 * Checks if a user has a specific role
 * @param userId The user ID to check
 * @param role The role to check for
 * @returns A promise resolving to a boolean indicating if the user has the role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    // Using a simpler query pattern to avoid type errors
    const result = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role);
    
    if (result.error) {
      logger.error('Error checking user role:', result.error);
      return false;
    }
    
    return result.data && result.data.length > 0;
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
    // Using a simpler query pattern to avoid type errors
    const result = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (result.error) {
      logger.error('Error fetching user role:', result.error);
      return null;
    }

    return result.data && result.data.length > 0 ? result.data[0].role : null;
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
    // Check if role entry exists without complex chains
    const result = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);
    
    if (result.error) {
      logger.error('Error checking existing user role:', result.error);
      return false;
    }

    let updateResult;
    
    if (result.data && result.data.length > 0) {
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
