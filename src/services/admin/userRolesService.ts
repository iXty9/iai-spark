
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Define the types that need to be exported
export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: UserRole | null;
  username?: string;  // Add username property
  last_sign_in_at?: string; // Add last_sign_in_at property
}

export interface UsersFetchOptions {
  page?: number;
  pageSize?: number;
  roleFilter?: UserRole;
}

export interface UsersSearchOptions extends UsersFetchOptions {
  searchQuery: string;
}

export interface UsersFetchResult {
  users: UserWithRole[];
  totalCount: number;
}

/**
 * Checks if the current user is an admin
 * @returns A promise resolving to a boolean indicating if the user is admin
 */
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    // If userId is not provided, get the current user from session
    if (!userId) {
      const authResult = await supabase.auth.getUser();
      userId = authResult.data?.user?.id;
      if (!userId) {
        logger.warn('checkIsAdmin: No user is logged in');
        return false;
      }
    }

    // Query the user_roles table
    const result = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');
    
    if (result.error) {
      logger.error('Error checking admin role:', result.error);
      return false;
    }
    
    return result.data && result.data.length > 0;
  } catch (error) {
    logger.error('Unexpected error in checkIsAdmin:', error);
    return false;
  }
}

/**
 * Fetch users with their roles
 */
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  try {
    const {
      page = 1,
      pageSize = 10,
      roleFilter
    } = options;
    
    const offset = (page - 1) * pageSize;
    
    // Instead of using RPC, we'll use a simpler approach for the fallback client
    // In a real implementation, you'd use a stored procedure for this
    logger.warn('Using simplified user fetching without RPC', {
      module: 'user-roles',
      once: true
    });
    
    // This is a simplified version that won't hit the type errors
    // In a real implementation with a valid Supabase connection, the RPC would work
    const result = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'list',
        page,
        pageSize,
        roleFilter
      }
    });
    
    if (result.error) {
      logger.error('Error fetching users:', result.error);
      return { users: [], totalCount: 0 };
    }
    
    // If we have data, use it
    if (result.data && Array.isArray(result.data.users)) {
      return {
        users: result.data.users as UserWithRole[],
        totalCount: result.data.totalCount || result.data.users.length
      };
    }
    
    // Fallback to empty results
    return { users: [], totalCount: 0 };
  } catch (error) {
    logger.error('Error in fetchUsers:', error);
    return { users: [], totalCount: 0 };
  }
}

/**
 * Search users by email or name
 */
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  try {
    const {
      searchQuery,
      page = 1,
      pageSize = 10,
      roleFilter
    } = options;
    
    // Using the admin-users function as a workaround for type issues
    // This would normally use an RPC call to a database function
    const result = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'search',
        searchQuery,
        page,
        pageSize,
        roleFilter
      }
    });
    
    if (result.error) {
      logger.error('Error searching users:', result.error);
      return { users: [], totalCount: 0 };
    }
    
    if (result.data && Array.isArray(result.data.users)) {
      return {
        users: result.data.users as UserWithRole[],
        totalCount: result.data.totalCount || result.data.users.length
      };
    }
    
    return { users: [], totalCount: 0 };
  } catch (error) {
    logger.error('Error in searchUsers:', error);
    return { users: [], totalCount: 0 };
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  try {
    // First check if the user already has a role entry
    const existingResult = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);
    
    if (existingResult.error) {
      logger.error('Error checking existing role:', existingResult.error);
      return false;
    }
    
    let result;
    
    if (existingResult.data && existingResult.data.length > 0) {
      // Update existing role
      result = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
    } else {
      // Insert new role
      result = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
    }
    
    if (result.error) {
      logger.error('Error updating user role:', result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error in updateUserRole:', error);
    return false;
  }
}
