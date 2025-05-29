
import { logger } from '@/utils/logging';
import { UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';
import { invokeAdminFunction } from './utils/adminFunctionUtils';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';
import { sanitizeInput } from '@/utils/security';

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
 * Check admin connection status using edge function
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  return withErrorHandling(async () => {
    try {
      // Test the edge function with a ping
      const response = await invokeAdminFunction('ping');
      
      return {
        isConnected: true,
        isAuthenticated: true,
        isAdmin: true,
        functionAvailable: true,
        environmentInfo: {
          environmentId: "production",
          environment: window.location.hostname,
          connectionId: 'edge-function',
          url: window.location.origin,
          lastConnection: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Edge function connection test failed:', error);
      
      return {
        isConnected: false,
        isAuthenticated: false,
        isAdmin: false,
        functionAvailable: false,
        environmentInfo: {
          environmentId: "production",
          environment: window.location.hostname,
          connectionId: 'edge-function-failed',
          url: window.location.origin,
          lastConnection: new Date().toISOString()
        }
      };
    }
  }, 'checkAdminConnectionStatus');
}

/**
 * Fetch users using edge function
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
    
    const response = await invokeAdminFunction('listUsers', {
      page,
      pageSize,
      roleFilter: roleFilter !== 'all' ? roleFilter : undefined
    });
    
    if (!response || !response.users) {
      throw new Error('Invalid response from admin function');
    }
    
    // Transform the response to match our UserWithRole interface
    const users: UserWithRole[] = response.users.map((user: any) => ({
      id: sanitizeInput(user.id),
      email: sanitizeInput(user.email || `User ${user.id}`),
      created_at: user.created_at || new Date().toISOString(),
      role: normalizeRole(user.role || 'user') as UserRole,
      username: sanitizeInput(user.username || ''),
      last_sign_in_at: user.last_sign_in_at || undefined
    }));
    
    return { 
      users,
      totalCount: response.totalCount || users.length
    };
  }, 'fetchUsers');
}

/**
 * Search users using edge function
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
    
    const response = await invokeAdminFunction('searchUsers', {
      searchQuery: sanitizedQuery,
      page,
      pageSize,
      roleFilter: roleFilter !== 'all' ? roleFilter : undefined
    });
    
    if (!response || !response.users) {
      throw new Error('Invalid response from admin function');
    }
    
    // Transform the response to match our UserWithRole interface
    const users: UserWithRole[] = response.users.map((user: any) => ({
      id: sanitizeInput(user.id),
      email: sanitizeInput(user.email || `User ${user.id}`),
      created_at: user.created_at || new Date().toISOString(),
      role: normalizeRole(user.role || 'user') as UserRole,
      username: sanitizeInput(user.username || ''),
      last_sign_in_at: user.last_sign_in_at || undefined
    }));
    
    return {
      users,
      totalCount: response.totalCount || users.length
    };
  }, 'searchUsers');
}

/**
 * Update user role using edge function
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

    // Sanitize user ID
    const sanitizedUserId = sanitizeInput(userId.trim());
    
    const response = await invokeAdminFunction('updateUserRole', {
      userId: sanitizedUserId,
      role: normalizedRole
    });
    
    if (!response || !response.success) {
      throw new Error('Failed to update user role');
    }
    
    logger.info(`Successfully updated role to ${normalizedRole} for user ${sanitizedUserId}`);
    return true;
  }, 'updateUserRole');
}
