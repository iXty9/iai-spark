
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Fetch user roles for a specific user
 */
export async function fetchUserRoles(userId: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('user_roles')
      .select('*, app_roles(*)')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching user roles', error);
    return [];
  }
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, roleId: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error assigning role to user', error);
    throw error;
  }
}
