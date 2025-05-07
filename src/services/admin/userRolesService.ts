
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { PostgrestError } from '@supabase/supabase-js';
import { UserRole, UserWithRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';

/**
 * Check if a user has admin role
 * @param userId The user ID to check
 * @returns Promise<boolean> True if user has admin role
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { hasRole, error } = await hasRole(userId, 'admin');
    
    if (error) {
      logger.error('Error checking admin status:', error, { module: 'userRoles' });
      return false;
    }
    
    return hasRole;
  } catch (err) {
    logger.error('Unexpected error in checkIsAdmin:', err, { module: 'userRoles' });
    return false;
  }
}

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
    logger.error('Unexpected error in assignRole:', err, { module: 'userRoles' });
    return { 
      success: false, 
      error: {
        message: 'Unexpected error assigning role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'UnexpectedError'
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
    logger.error('Unexpected error in removeRole:', err, { module: 'userRoles' });
    return { 
      success: false, 
      error: {
        message: 'Unexpected error removing role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'UnexpectedError'
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
    
    return { roles: data || [] };
  } catch (err) {
    logger.error('Unexpected error in getUserRoles:', err, { module: 'userRoles' });
    return { 
      roles: [], 
      error: {
        message: 'Unexpected error fetching roles',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'UnexpectedError'
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
    // Use from().select() instead of rpc() which might not be available
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
    logger.error('Unexpected error in hasRole:', err, { module: 'userRoles' });
    return { 
      hasRole: false, 
      error: {
        message: 'Unexpected error checking role',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'UnexpectedError'
      }
    };
  }
}

/**
 * Get all roles in the system
 */
export async function getAllRoles(): Promise<{ roles: string[]; error?: PostgrestError }> {
  try {
    // Query for distinct roles from the user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .order('role');
    
    if (error) {
      logger.error('Error fetching all roles:', error, { module: 'userRoles' });
      return { roles: [], error };
    }
    
    // Extract unique role values
    const uniqueRoles = [...new Set(data?.map(item => item.role as string) || [])];
    
    // If no roles found in the database, return default roles
    if (uniqueRoles.length === 0) {
      return { roles: ['admin', 'user'] };
    }
    
    return { roles: uniqueRoles };
  } catch (err) {
    logger.error('Unexpected error in getAllRoles:', err, { module: 'userRoles' });
    return { 
      roles: [], 
      error: {
        message: 'Unexpected error fetching roles',
        details: '',
        hint: '',
        code: 'UNKNOWN',
        name: 'UnexpectedError'
      }
    };
  }
}

// Re-export functions for user management
export { 
  fetchUsers,
  searchUsers,
  updateUserRole,
  checkAdminConnectionStatus
} from './userService';
