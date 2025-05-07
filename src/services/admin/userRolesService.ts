
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

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
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) logger.error('No authentication token available for admin-users function');
  return token ?? null;
}

// --- Helper function for invoking the admin-users function ---
async function invokeAdminUsers<T>(
  action: string,
  params: Record<string, any>,
  returnEmpty: T,
  logContext: Record<string, unknown> = {}
): Promise<T> {
  const token = await getAuthToken();
  if (!token) return returnEmpty;

  const result = await supabase.functions.invoke('admin-users', {
    body: { action, params },
    headers: { Authorization: `Bearer ${token}` }
  });

  if (result.error) {
    logger.error(`Error with action '${action}':`, result.error, logContext);
    return returnEmpty;
  }

  return result.data ?? returnEmpty;
}

// --- Single function for checking admin role ---
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id;
      if (!userId) {
        logger.warn('checkIsAdmin: No user is logged in');
        return false;
      }
    }
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');
    if (error) logger.error('Error checking admin role:', error);
    return !!(data && data.length);
  } catch (error) {
    logger.error('Unexpected error in checkIsAdmin:', error);
    return false;
  }
}

// --- Fetch users (with DRY helper) ---
export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  const { page = 1, pageSize = 10, roleFilter } = options;
  logger.info('Fetching users', { page, pageSize, roleFilter }, { module: 'user-roles' });

  // Use unified helper
  const data = await invokeAdminUsers<{ users: UserWithRole[]; totalCount: number }>(
    'listUsers',
    { page, pageSize, roleFilter },
    { users: [], totalCount: 0 },
    { module: 'user-roles' }
  );
  return {
    users: data.users ?? [],
    totalCount: data.totalCount ?? data.users.length ?? 0
  };
}

// --- Search users (with DRY helper) ---
export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  const { searchQuery, page = 1, pageSize = 10, roleFilter } = options;
  logger.info('Searching users', { searchQuery, page, pageSize, roleFilter }, { module: 'user-roles' });

  const data = await invokeAdminUsers<{ users: UserWithRole[]; totalCount: number }>(
    'searchUsers',
    { searchQuery, page, pageSize, roleFilter },
    { users: [], totalCount: 0 },
    { module: 'user-roles' }
  );
  return {
    users: data.users ?? [],
    totalCount: data.totalCount ?? data.users.length ?? 0
  };
}

// --- Update user role (with DRY helper) ---
export async function updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
  logger.info(`Updating user ${userId} role to ${newRole}`, { module: 'user-roles' });

  const data = await invokeAdminUsers<null>(
    'updateUserRole',
    { userId, role: newRole },
    null,
    { module: 'user-roles' }
  );
  // If request wasn't possible, data is null and already logged
  return data !== null;
}
