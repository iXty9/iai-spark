
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { eventBus, AppEvents } from '@/utils/event-bus';

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
    
    // Publish event when role is assigned
    eventBus.publish(AppEvents.USER_UPDATED, { userId, roleId });
    
    return data;
  } catch (error) {
    logger.error('Error assigning role to user', error);
    throw error;
  }
}

/**
 * Check if a user has admin role
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      logger.error('Error checking admin status', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    logger.error('Error checking admin status', error);
    return false;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(userId: string, roleId: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { error } = await client
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
      
    if (error) throw error;
    
    // Publish event when role is removed
    eventBus.publish(AppEvents.USER_UPDATED, { userId });
    
    return true;
  } catch (error) {
    logger.error('Error removing role from user', error);
    throw error;
  }
}
