import { logger } from '@/utils/logging';
import { UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult, ApiResponse } from './types/userTypes';
import { supabase } from '@/integrations/supabase/client';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';
import { sanitizeInput } from '@/utils/security';
import { connectionService } from '@/services/config/connection-service';

/**
 * Enhanced error handling wrapper
 */
const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Error in ${context}:`, error);
    throw new Error(`${context} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check admin connection status with comprehensive health checks
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  return withErrorHandling(async () => {
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

    // Get URL from config instead of accessing protected property
    const config = connectionService.getCurrentConfig();
    const supabaseUrl = config?.supabaseUrl || 'unknown';

    return {
      isConnected: !dbError,
      isAuthenticated: !!user && !authError,
      isAdmin,
      functionAvailable: true,
      environmentInfo: {
        environmentId: "production",
        environment: window.location.hostname,
        connectionId: user?.id || 'anonymous',
        url: supabaseUrl,
        lastConnection: new Date().toISOString()
      }
    };
  }, 'checkAdminConnectionStatus');
}

/**
 * Enhanced function to fetch auth user emails with better error handling
 */
const fetchAuthUserEmails = async (): Promise<Record<string, string>> => {
  const emailMap: Record<string, string> = {};
  
  try {
    logger.info('Attempting to fetch auth user data...');
    
    // Check if we have admin permissions by testing the admin API
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust based on your needs
    });
    
    if (authError) {
      logger.error('Failed to fetch auth users - Admin API error:', authError);
      console.error('Auth admin API error:', authError);
      return emailMap;
    }
    
    if (!authUsersData?.users) {
      logger.warn('Auth admin API returned no users data');
      return emailMap;
    }
    
    logger.info(`Successfully fetched ${authUsersData.users.length} auth users`);
    
    // Build email mapping with proper type checking
    authUsersData.users.forEach((authUser: any) => {
      if (authUser && typeof authUser === 'object' && authUser.id && authUser.email) {
        emailMap[authUser.id] = authUser.email;
      }
    });
    
    return emailMap;
  } catch (error) {
    logger.error('Exception in fetchAuthUserEmails:', error);
    console.error('Failed to fetch auth user emails:', error);
    return emailMap;
  }
};

/**
 * Fetch users with enhanced validation and error handling
 */
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  return withErrorHandling(async () => {
    const validation = validateSearchParams({
      page: options.page,
      pageSize: options.pageSize,
      roleFilter: options.roleFilter
    });
    
    if (!validation.success) {
      throw new Error(`Invalid parameters: ${validation.errors?.map(e => e.message).join(', ')}`);
    }
    
    const { page = 1, pageSize = 10, roleFilter } = validation.data!;
    const offset = (page - 1) * pageSize;
    
    // Get profiles with proper error handling
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, updated_at', { count: 'exact' })
      .range(offset, offset + pageSize - 1)
      .order('updated_at', { ascending: false });

    const { data: profiles, error: profileError, count } = await profileQuery;
    
    if (profileError) {
      logger.error('Error fetching profiles:', profileError);
      throw new Error(`Database error: ${profileError.message}`);
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
      // Don't throw here, continue with default roles
    }

    // Get auth users data for emails with enhanced error handling
    const authEmailMap = await fetchAuthUserEmails();
    
    // Combine the data with validation
    const users: UserWithRole[] = profiles.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id);
      const userEmail = authEmailMap[profile.id];
      
      const role = normalizeRole(userRole?.role || 'user');
      
      // Apply role filter if specified
      if (roleFilter && roleFilter !== 'all' && role !== roleFilter) {
        return null;
      }

      // Use real email if available, otherwise show a clear indication that email couldn't be fetched
      const displayEmail = userEmail || `[Email not accessible for ${profile.id}]`;

      return {
        id: profile.id,
        email: sanitizeInput(displayEmail),
        created_at: profile.updated_at || new Date().toISOString(),
        role: role as UserRole,
        username: sanitizeInput(profile.username || ''),
        last_sign_in_at: undefined // We'll need additional logic to get this from auth
      };
    }).filter(Boolean) as UserWithRole[];
    
    return { 
      users,
      totalCount: count || 0
    };
  }, 'fetchUsers');
}

/**
 * Search users with enhanced validation and sanitization
 */
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  return withErrorHandling(async () => {
    const validation = validateSearchParams({
      searchQuery: options.searchQuery,
      page: options.page,
      pageSize: options.pageSize,
      roleFilter: options.roleFilter
    });
    
    if (!validation.success) {
      throw new Error(`Invalid search parameters: ${validation.errors?.map(e => e.message).join(', ')}`);
    }
    
    const { searchQuery, page = 1, pageSize = 10, roleFilter } = validation.data!;
    
    if (!searchQuery?.trim()) {
      return fetchUsers({ page, pageSize, roleFilter });
    }
    
    const sanitizedQuery = sanitizeSearchQuery(searchQuery);
    const offset = (page - 1) * pageSize;
    
    // Search in profiles by username with sanitized input
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, updated_at', { count: 'exact' })
      .ilike('username', `%${sanitizedQuery}%`)
      .range(offset, offset + pageSize - 1)
      .order('updated_at', { ascending: false });

    const { data: profiles, error: profileError, count } = await profileQuery;
    
    if (profileError) {
      logger.error('Error searching profiles:', profileError);
      throw new Error(`Search failed: ${profileError.message}`);
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

    // Get auth users data for emails with enhanced error handling
    const authEmailMap = await fetchAuthUserEmails();

    // Combine the data with proper validation
    const users: UserWithRole[] = profiles.map(profile => {
      const userRole = userRoles?.find(ur => ur.user_id === profile.id);
      const userEmail = authEmailMap[profile.id];
      
      const role = normalizeRole(userRole?.role || 'user');
      
      // Apply role filter if specified
      if (roleFilter && roleFilter !== 'all' && role !== roleFilter) {
        return null;
      }

      // Use real email if available, otherwise show a clear indication that email couldn't be fetched
      const displayEmail = userEmail || `[Email not accessible for ${profile.id}]`;

      return {
        id: profile.id,
        email: sanitizeInput(displayEmail),
        created_at: profile.updated_at || new Date().toISOString(),
        role: role as UserRole,
        username: sanitizeInput(profile.username || ''),
        last_sign_in_at: undefined
      };
    }).filter(Boolean) as UserWithRole[];
    
    return {
      users,
      totalCount: count || 0
    };
  }, 'searchUsers');
}

/**
 * Update user role with comprehensive validation and error handling
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  return withErrorHandling(async () => {
    // Validate inputs
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    
    const normalizedRole = normalizeRole(role);
    if (!['admin', 'moderator', 'user'].includes(normalizedRole)) {
      throw new Error('Invalid role specified');
    }

    // Sanitize user ID (basic validation)
    const sanitizedUserId = sanitizeInput(userId.trim());
    
    // Check if user exists
    const { data: profileExists, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sanitizedUserId)
      .maybeSingle();
      
    if (profileError) {
      throw new Error(`Failed to verify user: ${profileError.message}`);
    }
    
    if (!profileExists) {
      throw new Error('User not found');
    }

    // Check if user role exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', sanitizedUserId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: normalizedRole })
        .eq('user_id', sanitizedUserId);
      
      if (error) {
        throw new Error(`Failed to update user role: ${error.message}`);
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: sanitizedUserId, role: normalizedRole });
      
      if (error) {
        throw new Error(`Failed to assign user role: ${error.message}`);
      }
    }
    
    logger.info(`Successfully updated role to ${normalizedRole} for user ${sanitizedUserId}`);
    return true;
  }, 'updateUserRole');
}
