
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole, setUserRole, hasRole } from './roleService';
import { UserRole, UserWithRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';
import { invokeAdminFunction } from './utils/adminFunctionUtils';

export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  return setUserRole(userId, role);
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    return await hasRole(userId, 'admin');
  } catch (error) {
    logger.error('Error checking admin role:', error);
    return false;
  }
}

/**
 * Fetch users with pagination and filtering
 */
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  try {
    // Use the edge function to fetch users with admin privileges
    const result = await invokeAdminFunction('listUsers', options);
    
    return {
      users: result.users || [],
      totalCount: result.totalCount || 0
    };
  } catch (error) {
    logger.error('Error in fetchUsers:', error, { module: 'roles' });
    return { users: [], totalCount: 0 };
  }
}

/**
 * Search users by query string
 */
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  try {
    // Use the edge function to search users
    const result = await invokeAdminFunction('searchUsers', options);
    
    return {
      users: result.users || [],
      totalCount: result.totalCount || 0
    };
  } catch (error) {
    logger.error('Error in searchUsers:', error, { module: 'roles' });
    return { users: [], totalCount: 0 };
  }
}

// Re-export types
export type { UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult };

// Re-export from roleService
export { 
  getUserRole,
  hasRole
};
