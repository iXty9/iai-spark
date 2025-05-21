
import { withSupabase } from '@/services/supabase/connection-service';

/**
 * Assign a role to a user
 */
export const assignRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    const result = await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      
      if (error) {
        console.error('Error assigning role:', error);
        return false;
      }
      
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error in assignRole:', error);
    return false;
  }
};

/**
 * Remove a role from a user
 */
export const removeRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    const result = await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) {
        console.error('Error removing role:', error);
        return false;
      }
      
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error in removeRole:', error);
    return false;
  }
};

/**
 * Update a user's role
 */
export const updateUserRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    // First remove existing roles
    await withSupabase(async (client) => {
      const { error } = await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error removing existing roles:', error);
        return false;
      }
    });
    
    // Then add the new role
    return await assignRole(userId, role);
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return false;
  }
};

/**
 * Check if a user has a specific role
 */
export const checkUserRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    const result = await withSupabase(async (client) => {
      const { data, error } = await client
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned is not really an error
          return false;
        }
        console.error('Error checking user role:', error);
        return false;
      }
      
      return !!data;
    });
    
    return result;
  } catch (error) {
    console.error('Error in checkUserRole:', error);
    return false;
  }
};

/**
 * Check if a user is an admin
 */
export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  return await checkUserRole(userId, 'admin');
};
