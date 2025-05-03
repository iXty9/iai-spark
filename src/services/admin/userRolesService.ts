
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  role: UserRole;
  username?: string;
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

// Helper function to invoke admin-users edge function
async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('No active session');
    }

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action, params },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });

    if (error) {
      logger.error(`Error invoking admin-users function (${action}):`, error, { module: 'roles' });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`Error in admin function call (${action}):`, error, { module: 'roles' });
    throw error;
  }
}

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

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    // Use the edge function to update user role
    await invokeAdminFunction('updateUserRole', { userId, role });
  } catch (error) {
    logger.error('Error in updateUserRole:', error, { module: 'roles' });
    throw error;
  }
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return false;
    
    const userId = session.session.user.id;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      logger.error('Error checking admin status:', error, { module: 'roles' });
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error in checkIsAdmin:', error, { module: 'roles' });
    return false;
  }
}
