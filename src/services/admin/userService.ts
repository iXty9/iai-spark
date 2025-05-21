
import { withSupabase } from '@/services/supabase/connection-service';
import { logger } from '@/utils/logging';
import { UserRole, UsersFetchResult, UsersFetchOptions } from './types/userTypes';
import { LogOptions } from '@/types/logger';

/**
 * Fetches users with pagination and filtering options
 */
export async function fetchUsers(options?: UsersFetchOptions): Promise<UsersFetchResult> {
  const {
    page = 1,
    perPage = 10,
    searchQuery = '',
    status,
    role,
    sortBy = 'created_at',
    sortDirection = 'desc',
    pageSize = perPage,
    roleFilter = role
  } = options || {};
  
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  try {
    return await withSupabase(async (supabaseClient) => {
      // Start with the base query
      let query = supabaseClient.from('profiles').select('*, user_roles(role)', { count: 'exact' });
      
      // Apply filters
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (roleFilter) {
        // Filter by role using a join with user_roles table
        query = query.eq('user_roles.role', roleFilter);
      }
      
      // Apply sorting
      if (sortBy && sortDirection) {
        query = query.order(sortBy, { ascending: sortDirection === 'asc' });
      }
      
      // Apply pagination
      query = query.range(from, to);
      
      // Execute the query
      const { data, error, count } = await query;
      
      if (error) {
        logger.error('Error fetching users', error, { 
          module: 'user-service',
          pageSize,
          totalCount: count
        } as LogOptions);
        throw error;
      }
      
      // Transform the data to match UserWithRole interface
      const users = data.map(user => ({
        ...user,
        role: user.user_roles?.role || ''
      }));
      
      return {
        users,
        count: count || 0
      };
    });
  } catch (error) {
    logger.error('Failed to fetch users', error, { module: 'user-service' });
    return { users: [], count: 0 };
  }
}

/**
 * Assigns a role to a user
 */
export async function assignUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    return await withSupabase(async (supabaseClient) => {
      // First check if the user already has this role
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();
      
      if (existingRole) {
        // Role already exists
        return true;
      }
      
      // Remove existing roles if assigning admin role (exclusive role)
      if (role === UserRole.ADMIN) {
        await supabaseClient
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
      }
      
      // Add the new role
      const { error } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) {
        logger.error(`Error assigning role ${role} to user ${userId}`, error, { module: 'user-service' });
        return false;
      }
      
      logger.info(`Assigned role ${role} to user ${userId}`, { module: 'user-service' });
      return true;
    });
  } catch (error) {
    logger.error(`Failed to assign role ${role} to user ${userId}`, error, { module: 'user-service' });
    return false;
  }
}

/**
 * Removes a role from a user
 */
export async function removeUserRole(userId: string, role: string): Promise<boolean> {
  try {
    return await withSupabase(async (supabaseClient) => {
      const { error } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) {
        logger.error(`Error removing role ${role} from user ${userId}`, error, { module: 'user-service' });
        return false;
      }
      
      logger.info(`Removed role ${role} from user ${userId}`, { module: 'user-service' });
      return true;
    });
  } catch (error) {
    logger.error(`Failed to remove role ${role} from user ${userId}`, error, { module: 'user-service' });
    return false;
  }
}
