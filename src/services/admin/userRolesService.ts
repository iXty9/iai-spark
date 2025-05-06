
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
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      if (!userId) {
        logger.warn('checkIsAdmin: No user is logged in');
        return false;
      }
    }

    // Query the user_roles table
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      logger.error('Error checking admin role:', error);
      return false;
    }
    
    return !!data;
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
    
    // Build the query
    let query = supabase
      .from('auth')
      .rpc('get_users_with_roles', {
        page_size: pageSize,
        page_offset: offset,
        role_filter: roleFilter || null
      });
      
    // Execute the query
    const { data: users, error, count } = await query;
    
    if (error) {
      logger.error('Error fetching users:', error);
      return { users: [], totalCount: 0 };
    }
    
    return {
      users: users as UserWithRole[],
      totalCount: count || users.length
    };
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
    
    const offset = (page - 1) * pageSize;
    
    // Build the query
    let query = supabase
      .from('auth')
      .rpc('search_users', {
        search_term: searchQuery,
        page_size: pageSize,
        page_offset: offset,
        role_filter: roleFilter || null
      });
      
    // Execute the query
    const { data: users, error, count } = await query;
    
    if (error) {
      logger.error('Error searching users:', error);
      return { users: [], totalCount: 0 };
    }
    
    return {
      users: users as UserWithRole[],
      totalCount: count || users.length
    };
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
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    let result;
    
    if (existingRole) {
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
