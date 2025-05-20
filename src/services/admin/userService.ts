
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Fetch users for admin management
 * @param search Optional search term for email or user display name
 * @param limit Number of users to fetch
 * @param page Page number for pagination
 */
export async function fetchUsers(search?: string, limit = 50, page = 1) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    let query = client
      .from('profiles')
      .select('id, username, email, created_at, updated_at, is_admin, avatar_url, metadata');
    
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
      .select();
    
    if (error) throw error;
    return {
      users: data || [],
      total: count || data?.length || 0
    };
  } catch (error) {
    logger.error('Error fetching users', error);
    return { users: [], total: 0 };
  }
}
