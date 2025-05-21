import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { UserRole, UsersFetchOptions, UsersFetchResult } from './types/userTypes';
import { eventBus, AppEvents } from '@/utils/event-bus';

/**
 * Fetch users with pagination and role filtering
 */
export async function fetchUsers(options: UsersFetchOptions): Promise<UsersFetchResult> {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');

    const { page = 1, pageSize = 10, roleFilter } = options;

    // Calculate the range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('profiles')
      .select('*, user_roles!inner(*)', { count: 'exact' });

    if (roleFilter) {
      query = query.eq('user_roles.role', roleFilter);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Error fetching users', error);
      throw error;
    }

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
    logger.error('Error fetching users', error);
    throw error;
  }
}

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
