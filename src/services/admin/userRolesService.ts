
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

    // Query the user_roles table with proper error handling
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');
    
    if (error) {
      logger.error('Error checking admin role:', error);
      return false;
    }
    
    return data && data.length > 0;
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
    
    logger.info('Fetching users with options:', { page, pageSize, roleFilter }, { module: 'user-roles' });
    
    // Get current auth session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      logger.error('No authentication token available for admin-users function');
      return { users: [], totalCount: 0 };
    }
    
    // Use the Supabase Functions API with proper authentication
    const result = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'listUsers',
        params: {
          page,
          pageSize,
          roleFilter
        }
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (result.error) {
      logger.error('Error fetching users:', result.error);
      return { users: [], totalCount: 0 };
    }
    
    // Check for proper response structure
    if (result.data && Array.isArray(result.data.users)) {
      logger.info(`Fetched ${result.data.users.length} users`, { module: 'user-roles' });
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
    
    logger.info('Searching users with query:', { 
      searchQuery, page, pageSize, roleFilter 
    }, { module: 'user-roles' });
    
    // Get current auth session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      logger.error('No authentication token available for admin-users function');
      return { users: [], totalCount: 0 };
    }
    
    // Using the admin-users function with proper authentication
    const result = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'searchUsers',
        params: {
          searchQuery,
          page,
          pageSize,
          roleFilter
        }
      },
      headers: {
        Authorization: `Bearer ${token}`
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
    logger.info(`Updating user ${userId} role to ${newRole}`, { module: 'user-roles' });
    
    // Get current auth session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      logger.error('No authentication token available for admin-users function');
      return false;
    }
    
    // Call the admin-users function to update the user role
    const result = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'updateUserRole',
        params: {
          userId,
          role: newRole
        }
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
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
