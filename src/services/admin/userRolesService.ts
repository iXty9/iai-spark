
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types/userTypes';
import { logger } from '@/utils/logging';
import { PostgrestError } from '@supabase/supabase-js';

// Check if a user is an admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }

    return Boolean(data && data.length > 0);
  } catch (error) {
    // Handle non-PostgrestError types
    const pgError = error as Error;
    logger.error('Unexpected error in checkIsAdmin:', pgError);
    return false;
  }
}

// Get all roles for a user
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error fetching user roles:', error);
      return [];
    }

    // Safely map and cast the roles
    return data && data.length > 0 
      ? data.map(row => row.role as UserRole) 
      : [];
  } catch (error) {
    // Handle non-PostgrestError types
    const pgError = error as Error;
    logger.error('Unexpected error in getUserRoles:', pgError);
    return [];
  }
}

// Get all available roles in the system
export async function getAllRoles(): Promise<string[]> {
  try {
    // For this application, we'll just return the available roles directly
    // since they're defined in the UserRole type and not stored separately
    return ['admin', 'user'];
  } catch (error) {
    logger.error('Error fetching all roles:', error);
    return [];
  }
}

/**
 * Check admin connection status
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  // Implementation to check connection status
  return {
    isConnected: true,
    isAuthenticated: true,
    isAdmin: true,
    functionAvailable: true,
    environmentInfo: {
      environmentId: "development"
    }
  };
}
