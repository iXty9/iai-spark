
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { PostgrestError } from '@supabase/supabase-js';
import { UserRole } from './types/userTypes';

/**
 * Assign a role to a user
 * @param userId The user's ID
 * @param role The role to assign
 */
export async function assignRole(
  userId: string, 
  role: string
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
        code: 'UNKNOWN'
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
  role: string
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
        code: 'UNKNOWN'
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
    // Removed the statusCode property from the log options
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
        code: 'UNKNOWN'
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
  role: string
): Promise<{ hasRole: boolean; error?: PostgrestError }> {
  try {
    const { data, error } = await supabase
      .rpc('has_role', {
        _user_id: userId,
        _role: role
      });
    
    if (error) {
      logger.error('Error checking user role:', error, { module: 'userRoles' });
      return { hasRole: false, error };
    }
    
    return { hasRole: data || false };
  } catch (err) {
    logger.error('Unexpected error in hasRole:', err, { module: 'userRoles' });
    return { 
      hasRole: false, 
      error: {
        message: 'Unexpected error checking role',
        details: '',
        hint: '',
        code: 'UNKNOWN'
      }
    };
  }
}

/**
 * Get all roles in the system
 */
export async function getAllRoles(): Promise<{ roles: string[]; error?: PostgrestError }> {
  try {
    // Use pg_enum to get all values of the app_role enum
    const { data, error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', 'app_role'::regtype);
    
    if (error) {
      logger.error('Error fetching all roles:', error, { module: 'userRoles' });
      return { roles: [], error };
    }
    
    const roles = data ? data.map(item => item.enumlabel) : [];
    return { roles };
  } catch (err) {
    logger.error('Unexpected error in getAllRoles:', err, { module: 'userRoles' });
    return { 
      roles: [], 
      error: {
        message: 'Unexpected error fetching roles',
        details: '',
        hint: '',
        code: 'UNKNOWN'
      }
    };
  }
}
