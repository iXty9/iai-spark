
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { PostgrestError } from '@supabase/supabase-js';
import { UserRole } from './types/userTypes';

// Export the types so they can be used by components
export type { UserRole, UserWithRole } from './types/userTypes';

/**
 * Assign a role to a user
 * @param userId The user's ID
 * @param role The role to assign
 */
export async function assignRole(
  userId: string, 
  role: UserRole
): Promise<{ success: boolean; error?: PostgrestError }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      });
    
    if (error) {
      logger.error('Error assigning role to user:', error, { module: 'userRoles' });
      return { success: false, error };
    }
    
    logger.info(`Role ${role} assigned to user ${userId}`, { module: 'userRoles' });
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in assignRole:', errorMsg, { module: 'userRoles' });
    return { 
      success: false, 
      error: {
        message: 'Unexpected error assigning role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'PostgrestError'
      } 
    };
  }
}

/**
 * Remove a role from a user
 * @param userId The user's ID
 * @param role The role to remove
 */
export async function removeRole(
  userId: string, 
  role: UserRole
): Promise<{ success: boolean; error?: PostgrestError }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .match({
        user_id: userId,
        role: role
      });
    
    if (error) {
      logger.error('Error removing role from user:', error, { module: 'userRoles' });
      return { success: false, error };
    }
    
    logger.info(`Role ${role} removed from user ${userId}`, { module: 'userRoles' });
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in removeRole:', errorMsg, { module: 'userRoles' });
    return { 
      success: false, 
      error: {
        message: 'Unexpected error removing role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'PostgrestError'
      }
    };
  }
}

/**
 * Get all roles for a specific user
 * @param userId The user's ID
 */
export async function getUserRoles(
  userId: string
): Promise<{ roles: UserRole[]; error?: PostgrestError }> {
  try {
    logger.info(`Fetching roles for user ${userId}`, { 
      module: 'userRoles' 
    });
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, created_at')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error fetching user roles:', error, { module: 'userRoles' });
      return { roles: [], error };
    }
    
    const rolesList = data?.map(item => item.role as UserRole) || [];
    return { roles: rolesList };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in getUserRoles:', errorMsg, { module: 'userRoles' });
    return { 
      roles: [], 
      error: {
        message: 'Unexpected error fetching roles',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'PostgrestError'
      }
    };
  }
}

/**
 * Check if a user has a specific role
 * @param userId The user's ID
 * @param role The role to check
 */
export async function hasRole(
  userId: string, 
  role: UserRole
): Promise<{ hasRole: boolean; error?: PostgrestError }> {
  try {
    // Using a direct query instead of RPC since RPC isn't available in the client
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) {
      logger.error('Error checking user role:', error, { module: 'userRoles' });
      return { hasRole: false, error };
    }
    
    return { hasRole: (data && data.length > 0) || false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in hasRole:', errorMsg, { module: 'userRoles' });
    return { 
      hasRole: false, 
      error: {
        message: 'Unexpected error checking role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'PostgrestError'
      }
    };
  }
}

/**
 * Get all roles in the system
 */
export async function getAllRoles(): Promise<{ roles: string[]; error?: PostgrestError }> {
  try {
    // Get distinct roles from user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('role');
    
    if (error) {
      logger.error('Error fetching all roles:', error, { module: 'userRoles' });
      return { roles: [], error };
    }
    
    const uniqueRoles = Array.from(new Set(data?.map(item => item.role as string) || []));
    return { roles: uniqueRoles };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Unexpected error in getAllRoles:', errorMsg, { module: 'userRoles' });
    return { 
      roles: [], 
      error: {
        message: 'Unexpected error fetching roles',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'PostgrestError'
      }
    };
  }
}

/**
 * Check if a user is an admin
 * @param userId The user's ID
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { hasRole: isAdmin } = await hasRole(userId, 'admin');
    return isAdmin;
  } catch (error) {
    logger.error('Error checking admin status:', error, { module: 'userRoles' });
    return false;
  }
}
