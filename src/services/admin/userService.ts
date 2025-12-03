
import { logger } from '@/utils/logging';
import { UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';
import { supabase } from '@/integrations/supabase/client';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';
import { sanitizeInput } from '@/utils/security';
import { invokeAdminFunction } from './utils/adminFunctionUtils';

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
  }, 'checkAdminConnectionStatus');
}

/**
 * Fetch users via the secure admin-users edge function
 * This replaces direct supabase.auth.admin.listUsers() calls
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
    
    // Use the edge function instead of direct admin API calls
    const result = await invokeAdminFunction('listUsers', {
      page,
      pageSize,
      roleFilter: roleFilter !== 'all' ? roleFilter : undefined
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    // Map response to expected format with sanitization
    const users: UserWithRole[] = (result?.users || []).map((user: any) => ({
      id: user.id,
      email: sanitizeInput(user.email || ''),
      created_at: user.created_at || new Date().toISOString(),
      role: normalizeRole(user.role || 'user') as UserRole,
      username: sanitizeInput(user.username || ''),
      last_sign_in_at: user.last_sign_in_at
    }));
    
    return { 
      users,
      totalCount: result?.totalCount || 0
    };
  }, 'fetchUsers');
}

/**
 * Search users via the secure admin-users edge function
 * This replaces direct supabase.auth.admin.listUsers() calls
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
    
    // If no search query, fall back to list
    if (!searchQuery?.trim()) {
      return fetchUsers({ page, pageSize, roleFilter });
    }
    
    // Use the edge function for search
    const result = await invokeAdminFunction('searchUsers', {
      searchQuery: sanitizeSearchQuery(searchQuery),
      page,
      pageSize,
      roleFilter: roleFilter !== 'all' ? roleFilter : undefined
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    // Map response with sanitization
    const users: UserWithRole[] = (result?.users || []).map((user: any) => ({
      id: user.id,
      email: sanitizeInput(user.email || ''),
      created_at: user.created_at || new Date().toISOString(),
      role: normalizeRole(user.role || 'user') as UserRole,
      username: sanitizeInput(user.username || ''),
      last_sign_in_at: user.last_sign_in_at
    }));
    
    return {
      users,
      totalCount: result?.totalCount || 0
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
