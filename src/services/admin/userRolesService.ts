
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

export async function fetchUsers(options: UsersFetchOptions = {}): Promise<UsersFetchResult> {
  const { page = 1, pageSize = 10, roleFilter } = options;
  
  try {
    // First get users with pagination
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      page: page - 1, // Supabase uses 0-indexed pages
      perPage: pageSize,
    });

    if (usersError) {
      logger.error('Error fetching users:', usersError, { module: 'roles' });
      throw usersError;
    }

    if (!usersData) {
      return { users: [], totalCount: 0 };
    }

    // Get total count via separate call - this is a workaround since TypeScript doesn't see the count property
    let totalCount = 0;
    try {
      // @ts-ignore - The count property exists at runtime but TypeScript doesn't recognize it
      totalCount = usersData.count || 0;
    } catch (error) {
      logger.error('Error accessing count property:', error, { module: 'roles' });
    }

    // Then get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      logger.error('Error fetching roles:', rolesError, { module: 'roles' });
      throw rolesError;
    }

    // And all profiles for usernames
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      logger.error('Error fetching profiles:', profilesError, { module: 'roles' });
      // Not throwing here as username is optional
    }

    // Create a map of user_id to role
    const roleMap: Record<string, UserRole> = {};
    roles?.forEach((role: any) => {
      roleMap[role.user_id] = role.role as UserRole;
    });

    // Create a map of user_id to username
    const usernameMap: Record<string, string> = {};
    profiles?.forEach((profile: any) => {
      if (profile.username) {
        usernameMap[profile.id] = profile.username;
      }
    });

    // Map users with their roles
    let mappedUsers = usersData.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      role: roleMap[user.id] || 'user',
      username: usernameMap[user.id]
    }));

    // Apply role filter if specified
    if (roleFilter) {
      mappedUsers = mappedUsers.filter(user => user.role === roleFilter);
    }

    return { 
      users: mappedUsers,
      totalCount: totalCount
    };
  } catch (error) {
    logger.error('Error in fetchUsers:', error, { module: 'roles' });
    return { users: [], totalCount: 0 };
  }
}

export async function searchUsers(options: UsersSearchOptions): Promise<UsersFetchResult> {
  const { searchQuery, page = 1, pageSize = 10, roleFilter } = options;
  
  try {
    // Fetch all users first since Supabase doesn't provide direct search capabilities
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000, // Get a large batch to search through
    });

    if (usersError) {
      logger.error('Error fetching users for search:', usersError, { module: 'roles' });
      throw usersError;
    }

    if (!usersData) {
      return { users: [], totalCount: 0 };
    }

    // Then get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      logger.error('Error fetching roles:', rolesError, { module: 'roles' });
      throw rolesError;
    }

    // And all profiles for usernames
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      logger.error('Error fetching profiles:', profilesError, { module: 'roles' });
    }

    // Create a map of user_id to role
    const roleMap: Record<string, UserRole> = {};
    roles?.forEach((role: any) => {
      roleMap[role.user_id] = role.role as UserRole;
    });

    // Create a map of user_id to username
    const usernameMap: Record<string, string> = {};
    profiles?.forEach((profile: any) => {
      if (profile.username) {
        usernameMap[profile.id] = profile.username;
      }
    });

    // Map users with their roles
    let mappedUsers = usersData.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      role: roleMap[user.id] || 'user',
      username: usernameMap[user.id]
    }));

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      mappedUsers = mappedUsers.filter(user => 
        user.email.toLowerCase().includes(query) || 
        (user.username && user.username.toLowerCase().includes(query))
      );
    }

    // Apply role filter if specified
    if (roleFilter) {
      mappedUsers = mappedUsers.filter(user => user.role === roleFilter);
    }

    // Calculate total count for pagination
    const totalCount = mappedUsers.length;

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = mappedUsers.slice(startIndex, startIndex + pageSize);

    return { 
      users: paginatedUsers,
      totalCount
    };
  } catch (error) {
    logger.error('Error in searchUsers:', error, { module: 'roles' });
    return { users: [], totalCount: 0 };
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    // First check if user already has a role
    const { data, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (checkError) {
      logger.error('Error checking user role:', checkError, { module: 'roles' });
      throw checkError;
    }

    if (data && data.length > 0) {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) {
        logger.error('Error updating user role:', error, { module: 'roles' });
        throw error;
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        logger.error('Error inserting user role:', error, { module: 'roles' });
        throw error;
      }
    }
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
