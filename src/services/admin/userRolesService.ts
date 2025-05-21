
import { withSupabase } from '../supabase/connection-service';
import { logger } from '@/utils/logging';

export async function getUserRoles(userId: string) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    });
  } catch (error) {
    logger.error('Error fetching user roles', error, { module: 'user-roles-service', userId });
    return [];
  }
}

export async function addUserRole(userId: string, role: string) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      
      if (error) throw error;
      return true;
    });
  } catch (error) {
    logger.error('Error adding user role', error, { module: 'user-roles-service', userId, role });
    return false;
  }
}

export async function removeUserRole(userId: string, role: string) {
  try {
    return await withSupabase(async (client) => {
      const { error } = await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
      return true;
    });
  } catch (error) {
    logger.error('Error removing user role', error, { module: 'user-roles-service', userId, role });
    return false;
  }
}

export async function hasRole(userId: string, role: string) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return !!data;
    });
  } catch (error) {
    logger.error('Error checking user role', error, { module: 'user-roles-service', userId, role });
    return false;
  }
}

export async function updateUserRole(userId: string, oldRole: string, newRole: string) {
  try {
    return await withSupabase(async (client) => {
      // First, delete the old role
      const { error: removeError } = await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', oldRole);
      
      if (removeError) throw removeError;
      
      // Then, add the new role
      const { error: addError } = await client
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole }]);
      
      if (addError) throw addError;
      
      return true;
    });
  } catch (error) {
    logger.error('Error updating user role', error, { module: 'user-roles-service', userId, oldRole, newRole });
    return false;
  }
}
