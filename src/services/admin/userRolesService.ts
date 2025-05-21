import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { UserRole } from './types/userTypes';
import { withSupabase } from '@/utils/supabase-helpers';

/**
 * Check if a user has admin role
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        logger.error('Error checking admin role', error);
        return false;
      }
      
      return !!data;
    });
  } catch (error) {
    logger.error('Error in checkIsAdmin', error);
    return false;
  }
}

/**
 * Check if a user has a specific role
 */
export async function checkHasRole(userId: string, role: UserRole): Promise<boolean> {
  if (!userId) return false;
  
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', role)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        logger.error(`Error checking ${role} role`, error);
        return false;
      }
      
      return !!data;
    });
  } catch (error) {
    logger.error(`Error in checkHasRole for ${role}`, error);
    return false;
  }
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, role: UserRole): Promise<boolean> {
  if (!userId) return false;
  
  try {
    return await withSupabase(async (client) => {
      // Check if role assignment already exists
      const { data: existing, error: checkError } = await client
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();
      
      if (checkError) {
        logger.error('Error checking existing role', checkError);
        return false;
      }
      
      // If role already assigned, we're done
      if (existing) {
        return true;
      }
      
      // Otherwise, insert the role
      const { error } = await client
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role
        });
      
      if (error) {
        logger.error('Error assigning role to user', error);
        return false;
      }
      
      return true;
    });
  } catch (error) {
    logger.error('Error in assignRoleToUser', error);
    return false;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(userId: string, role: UserRole): Promise<boolean> {
  if (!userId) return false;
  
  try {
    return await withSupabase(async (client) => {
      const { error } = await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) {
        logger.error('Error removing role from user', error);
        return false;
      }
      
      return true;
    });
  } catch (error) {
    logger.error('Error in removeRoleFromUser', error);
    return false;
  }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  if (!userId) return [];
  
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        logger.error('Error getting user roles', error);
        return [];
      }
      
      return data?.map(item => item.role as UserRole) || [];
    });
  } catch (error) {
    logger.error('Error in getUserRoles', error);
    return [];
  }
}
