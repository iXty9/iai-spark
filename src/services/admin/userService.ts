import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';
import { UserRole, UsersFetchResult, UsersFetchOptions } from './types/userTypes';
import { eventBus, AppEvents } from '@/utils/event-bus';

/**
 * Fetch users with optional filtering, sorting and pagination
 */
export const fetchUsers = async (options: UsersFetchOptions = {}): Promise<UsersFetchResult> => {
  try {
    return await withSupabase(async (client) => {
      // Destructure options with defaults
      const { 
        page = 1, 
        pageSize = 10, 
        searchQuery = '', 
        roleFilter = 'all',
        sortBy = 'created_at', 
        sortDirection = 'desc' 
      } = options;
      
      // Calculate pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Start building query
      let query = client.from('profiles')
        .select(`
          id,
          email:auth.users!profiles.id(email),
          username,
          first_name, 
          last_name,
          avatar_url,
          created_at:auth.users!profiles.id(created_at),
          last_sign_in_at:auth.users!profiles.id(last_sign_in_at),
          role:user_roles(role)
        `, { count: 'exact' });
      
      // Add search filtering if provided
      if (searchQuery) {
        // Try to match against email, username, or name
        query = query.or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,auth.users.email.ilike.%${searchQuery}%`);
      }
      
      // Add role filtering if not 'all'
      if (roleFilter && roleFilter !== 'all') {
        // Join with user_roles to filter by role
        // This needs to be handled differently depending on the role we're filtering for
        if (roleFilter === 'admin') {
          query = query.in('id', client.from('user_roles').select('user_id').eq('role', 'admin'));
        } else if (roleFilter === 'user') {
          // For users without admin role, this is more complex
          // Get all non-admin users (those not in the admin role list)
          query = query.not('id', 'in', client.from('user_roles').select('user_id').eq('role', 'admin'));
        }
      }

      // Add sorting
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });
      
      // Add pagination
      query = query.range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        logger.error('Error fetching users:', error, { 
          module: 'userService',
          pageSize,
          roleFilter,
          searchQuery
        });
        throw error;
      }
      
      // Process the data to flatten nested JSON
      const processedUsers = data.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        avatar_url: user.avatar_url || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        // Extract role from the nested array
        role: user.role?.length > 0 ? user.role[0].role : 'user'
      }));
            
      return {
        users: processedUsers,
        count: count || 0
      };
    });
  } catch (error) {
    logger.error('Error in fetchUsers function:', error);
    return { users: [], count: 0 };
  }
};

/**
 * Search users based on provided criteria
 */
export async function searchUsers(options: UsersFetchOptions): Promise<UsersFetchResult> {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const {
      searchQuery = '',
      page = 1, 
      pageSize = 10,
      roleFilter,
    } = options;
    
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Build query
    let query = client
      .from('profiles')
      .select('*, user_roles!inner(*)', { count: 'exact' });
    
    // Apply filters
    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
    }
    
    if (roleFilter) {
      query = query.eq('user_roles.role', roleFilter);
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Map data to UserWithRole interface
    const users = (data || []).map(item => ({
      id: item.id,
      email: item.email || '',
      username: item.username || '',
      full_name: item.full_name || '',
      avatar_url: item.avatar_url || '',
      role: item.user_roles?.role || 'user',
      created_at: item.created_at,
      last_sign_in_at: item.last_sign_in_at,
    }));
    
    return {
      users,
      totalCount: count || users.length,
    };
  } catch (error) {
    logger.error('Error searching users', error);
    throw error;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  if (!userId) throw new Error('User ID is required');
  
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    // First check if user already has the role
    const { data: existingRole } = await client
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingRole) {
      // Update existing role
      const { error } = await client
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
        
      if (error) throw error;
    } else {
      // Insert new role
      const { error } = await client
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
    }
    
    // Publish event for role update
    eventBus.publish(AppEvents.USER_UPDATED, { userId, role });
    
    return true;
  } catch (error) {
    logger.error('Error updating user role', error);
    throw error;
  }
}
