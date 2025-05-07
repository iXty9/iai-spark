
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { getConnectionInfo } from '@/services/supabase/connection-service';

export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: UserRole | null;
  username?: string;
  last_sign_in_at?: string;
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

// --- Helper function to get auth token and log error ---
async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      logger.error('No authentication token available for admin-users function', {
        module: 'user-roles',
        connectionInfo: getConnectionInfo()
      });
    }
    return token ?? null;
  } catch (error) {
    logger.error('Error getting authentication token', error, {
      module: 'user-roles',
      connectionInfo: getConnectionInfo()
    });
    return null;
  }
}

// --- Helper function for invoking the admin-users function ---
async function invokeAdminUsers<T>(
  action: string,
  params: Record<string, any>,
  returnEmpty: T,
  logContext: Record<string, unknown> = {}
): Promise<T> {
  try {
    const token = await getAuthToken();
    if (!token) return returnEmpty;

    logger.info(`Invoking admin-users function with action: ${action}`, {
      ...logContext,
      module: 'user-roles',
      params: JSON.stringify(params),
      connectionInfo: getConnectionInfo()
    });

    const result = await supabase.functions.invoke('admin-users', {
      body: { action, params },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (result.error) {
      logger.error(`Error with action '${action}':`, result.error, {
        ...logContext,
        module: 'user-roles',
        connectionInfo: getConnectionInfo(),
        statusCode: result.error?.status || 'unknown'
      });
      
      // Add more detailed diagnostics for specific error types
      if (result.error?.status === 401) {
        logger.error('Authentication error (401) when invoking admin-users function. This may indicate a cross-environment token issue.', {
          module: 'user-roles',
          connectionInfo: getConnectionInfo()
        });
      } else if (result.error?.status === 404) {
        logger.error('Function not found (404) when invoking admin-users function. This may indicate the function is not deployed in this environment.', {
          module: 'user-roles',
          connectionInfo: getConnectionInfo()
        });
      }
      
      return returnEmpty;
    }

    return result.data ?? returnEmpty;
  } catch (error) {
    logger.error(`Unexpected error invoking admin-users function (${action}):`, error, {
      ...logContext,
      module: 'user-roles',
      connectionInfo: getConnectionInfo()
    });
    return returnEmpty;
  }
}

// --- Single function for checking admin role ---
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id;
      if (!userId) {
        logger.warn('checkIsAdmin: No user is logged in', {
          module: 'user-roles',
          connectionInfo: getConnectionInfo()
        });
        return false;
      }
    }
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');
    
    if (error) {
      logger.error('Error checking admin role:', error, {
        module: 'user-roles',
        connectionInfo: getConnectionInfo()
      });
      return false;
    }
    
    return !!(data && data.length);
  } catch (error) {
    logger.error('Unexpected error in checkIsAdmin:', error, {
      module: 'user-roles',
      connectionInfo: getConnectionInfo()
    });
    return false;
  }
}

// --- Fetch users (with DRY helper) ---
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  const { page = 1, pageSize = 10, roleFilter } = options;
  logger.info('Fetching users', { page, pageSize, roleFilter }, {
    module: 'user-roles',
    connectionInfo: getConnectionInfo()
  });

  // Use unified helper
  const data = await invokeAdminUsers<{ users: UserWithRole[]; totalCount: number }>(
    'listUsers',
    { page, pageSize, roleFilter },
    { users: [], totalCount: 0 },
    { module: 'user-roles' }
  );
  
  return {
    users: data.users ?? [],
    totalCount: data.totalCount ?? data.users?.length ?? 0
  };
}

// --- Search users (with DRY helper) ---
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  const { searchQuery, page = 1, pageSize = 10, roleFilter } = options;
  logger.info('Searching users', { searchQuery, page, pageSize, roleFilter }, { 
    module: 'user-roles',
    connectionInfo: getConnectionInfo()
  });

  const data = await invokeAdminUsers<{ users: UserWithRole[]; totalCount: number }>(
    'searchUsers',
    { searchQuery, page, pageSize, roleFilter },
    { users: [], totalCount: 0 },
    { module: 'user-roles' }
  );
  
  return {
    users: data.users ?? [],
    totalCount: data.totalCount ?? data.users?.length ?? 0
  };
}

// --- Update user role (with DRY helper) ---
export async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  logger.info(`Updating user ${userId} role to ${newRole}`, {
    module: 'user-roles',
    connectionInfo: getConnectionInfo()
  });

  const data = await invokeAdminUsers<null>(
    'updateUserRole',
    { userId, role: newRole },
    null,
    { module: 'user-roles' }
  );
  
  // If request wasn't possible, data is null and already logged
  return data !== null;
}

// --- Diagnostic function to check connection status ---
export async function checkAdminConnectionStatus(): Promise<{
  isConnected: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  functionAvailable: boolean;
  environmentInfo: ReturnType<typeof getConnectionInfo>;
}> {
  const environmentInfo = getConnectionInfo();
  
  try {
    // 1. Check if we have a Supabase connection
    if (!supabase) {
      return {
        isConnected: false,
        isAuthenticated: false,
        isAdmin: false,
        functionAvailable: false,
        environmentInfo
      };
    }
    
    // 2. Check if we're authenticated
    const { data } = await supabase.auth.getSession();
    const isAuthenticated = !!data?.session?.user;
    
    if (!isAuthenticated) {
      return {
        isConnected: true,
        isAuthenticated: false,
        isAdmin: false,
        functionAvailable: false,
        environmentInfo
      };
    }
    
    // 3. Check if the user is an admin
    const isAdmin = await checkIsAdmin(data.session?.user?.id);
    
    // 4. Check if the edge function is available
    let functionAvailable = false;
    try {
      const token = await getAuthToken();
      if (token) {
        // Make a lightweight call to check function availability
        const result = await supabase.functions.invoke('admin-users', {
          body: { action: 'ping' },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        functionAvailable = !result.error || result.error.status !== 404;
      }
    } catch (error) {
      logger.error('Error checking function availability:', error);
      functionAvailable = false;
    }
    
    return {
      isConnected: true,
      isAuthenticated,
      isAdmin,
      functionAvailable,
      environmentInfo
    };
  } catch (error) {
    logger.error('Error checking admin connection status:', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isAdmin: false,
      functionAvailable: false,
      environmentInfo
    };
  }
}
