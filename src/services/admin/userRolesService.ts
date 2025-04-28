
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: UserRole;
  username?: string;
}

export async function fetchUsers(): Promise<UserWithRole[]> {
  try {
    // First get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      logger.error('Error fetching users:', usersError, { module: 'roles' });
      throw usersError;
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
    return users.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      role: roleMap[user.id] || 'user',
      username: usernameMap[user.id]
    }));
  } catch (error) {
    logger.error('Error in fetchUsers:', error, { module: 'roles' });
    return [];
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
