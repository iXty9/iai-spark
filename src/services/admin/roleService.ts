
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Fetch all roles
 */
export async function fetchAllRoles() {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_roles')
      .select('*')
      .order('role_name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching roles', error);
    return [];
  }
}

/**
 * Create a new role
 */
export async function createRole(roleName: string, description?: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_roles')
      .insert({
        role_name: roleName,
        description: description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating role', error);
    throw error;
  }
}

/**
 * Delete a role
 */
export async function deleteRole(roleId: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { error } = await client
      .from('app_roles')
      .delete()
      .eq('id', roleId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error deleting role', error);
    throw error;
  }
}

/**
 * Update a role
 */
export async function updateRole(roleId: string, updates: { role_name?: string; description?: string }) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating role', error);
    throw error;
  }
}
