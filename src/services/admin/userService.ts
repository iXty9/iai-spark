
import { logger } from '@/utils/logging';
import { UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';
import { supabase } from '@/integrations/supabase/client';

/**
 * Check admin connection status with real health checks
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  try {
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Test if current user is admin
    let isAdmin = false;
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      isAdmin = !!roleData;
    }

    return {
      isConnected: !dbError,
      isAuthenticated: !!user && !authError,
      isAdmin,
      functionAvailable: true,
      environmentInfo: {
        environmentId: "production",
        environment: window.location.hostname,
        connectionId: user?.id || 'anonymous',
        url: supabase.supabaseUrl,
        lastConnection: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error checking admin connection status:', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isAdmin: false,
      functionAvailable: false,
      environmentInfo: {
        environmentId: "unknown",
        environment: "error",
        connectionId: "error",
        url: "error",
        lastConnection: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetch users with real database queries and pagination
 */
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  try {
    const { page = 1, pageSize = 10, roleFilter } = options;
    const offset = (page - 1) * pageSize;
    
    // First get all profiles with pagination
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, created_at', { count: 'exact' })
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    const { data: profiles, error: profileError, count } = await profileQuery;
    
    if (profileError) {
      logger.error('Error fetching profiles:', profileError);
      return { users: [], totalCount: 0 };
    }

    if (!profiles || profiles.length === 0) {
      return { users: [], totalCount: count || 0 };
    }

    // Get user roles for these profiles
    const profileIds = profiles.map(p => p.id);
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', profileIds);

    if (rolesError) {
      logger.error('Error fetching user roles:', rolesError);
    }

    // Get auth users data for emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      logger.error('Error fetching auth users:', authError);
    }

    // Combine the data
    const users: UserWithRole[] = profiles.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id);
      const authUser = authUsers?.users?.find(au => au.id === profile.id);
      
      const role = userRole?.role || 'user';
      
      // Apply role filter if specified
      if (roleFilter && roleFilter !== 'all' && role !== roleFilter) {
        return null;
      }

      return {
        id: profile.id,
        email: authUser?.email || `user-${profile.id.slice(0, 8)}@example.com`,
        created_at: authUser?.created_at || profile.created_at || new Date().toISOString(),
        role: role as UserRole,
        username: profile.username,
        last_sign_in_at: authUser?.last_sign_in_at
      };
    }).filter(Boolean) as UserWithRole[];
    
    return { 
      users,
      totalCount: count || 0
    };
  } catch (error) {
    logger.error('Error in fetchUsers:', error);
    return { users: [], totalCount: 0 };
  }
}

/**
 * Search users with real database queries
 */
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  try {
    const { searchQuery, page = 1, pageSize = 10, roleFilter } = options;
    const offset = (page - 1) * pageSize;
    
    if (!searchQuery.trim()) {
      return fetchUsers({ page, pageSize, roleFilter });
    }
    
    // Search in profiles by username
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, created_at', { count: 'exact' })
      .ilike('username', `%${searchQuery}%`)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    const { data: profiles, error: profileError, count } = await profileQuery;
    
    if (profileError) {
      logger.error('Error searching profiles:', profileError);
      return { users: [], totalCount: 0 };
    }

    if (!profiles || profiles.length === 0) {
      return { users: [], totalCount: count || 0 };
    }

    // Get user roles for these profiles
    const profileIds = profiles.map(p => p.id);
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', profileIds);

    if (rolesError) {
      logger.error('Error fetching user roles:', rolesError);
    }

    // Get auth users data for emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      logger.error('Error fetching auth users:', authError);
    }

    // Combine the data
    const users: UserWithRole[] = profiles.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id);
      const authUser = authUsers?.users?.find(au => au.id === profile.id);
      
      const role = userRole?.role || 'user';
      
      // Apply role filter if specified
      if (roleFilter && roleFilter !== 'all' && role !== roleFilter) {
        return null;
      }

      return {
        id: profile.id,
        email: authUser?.email || `user-${profile.id.slice(0, 8)}@example.com`,
        created_at: authUser?.created_at || profile.created_at || new Date().toISOString(),
        role: role as UserRole,
        username: profile.username,
        last_sign_in_at: authUser?.last_sign_in_at
      };
    }).filter(Boolean) as UserWithRole[];
    
    return {
      users,
      totalCount: count || 0
    };
  } catch (error) {
    logger.error('Error in searchUsers:', error);
    return { users: [], totalCount: 0 };
  }
}

/**
 * Update user role with real database operations
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    // Check if user role exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (error) {
        logger.error('Error updating user role:', error);
        return false;
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) {
        logger.error('Error inserting user role:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error in updateUserRole:', error);
    return false;
  }
}
