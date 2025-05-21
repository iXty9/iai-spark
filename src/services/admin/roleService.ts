
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { checkIsAdmin } from './userRolesService';

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

/**
 * Check admin connection status
 * This function checks if the current user can connect to the admin functionalities
 */
export async function checkAdminConnectionStatus() {
  try {
    const client = await supabase;
    if (!client) {
      return {
        isConnected: false,
        isAuthenticated: false,
        isAdmin: false,
        functionAvailable: false,
        environmentInfo: {
          environmentId: 'unknown',
          version: 'unknown',
        }
      };
    }
    
    // Get session to check authentication
    const { data: sessionData } = await client.auth.getSession();
    const isAuthenticated = !!sessionData?.session?.user;
    
    if (!isAuthenticated) {
      return {
        isConnected: true,
        isAuthenticated: false,
        isAdmin: false,
        functionAvailable: false,
        environmentInfo: {
          environmentId: 'disconnected',
          version: 'unknown',
        }
      };
    }
    
    // Check if user is admin
    const userId = sessionData.session?.user?.id;
    const isAdmin = userId ? await checkIsAdmin(userId) : false;
    
    // Simple test to see if we can query the app_roles table
    // This helps verify database connection and proper permissions
    let functionAvailable = false;
    try {
      const { data, error } = await client
        .from('app_roles')
        .select('id')
        .limit(1);
      
      functionAvailable = !error && Array.isArray(data);
    } catch (functionError) {
      logger.error('Error checking function availability', functionError);
    }
    
    // Get environment info if available
    const environmentInfo = {
      environmentId: process.env.NODE_ENV || 'development',
      url: client.supabaseUrl,
      timestamp: new Date().toISOString(),
    };
    
    return {
      isConnected: true,
      isAuthenticated,
      isAdmin,
      functionAvailable,
      environmentInfo
    };
  } catch (error) {
    logger.error('Error checking admin connection status', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isAdmin: false,
      functionAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environmentInfo: {
        environmentId: 'error',
        version: 'unknown',
      }
    };
  }
}
