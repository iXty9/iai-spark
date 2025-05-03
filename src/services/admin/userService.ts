
import { logger } from '@/utils/logging';
import { invokeAdminFunction } from './utils/adminFunctionUtils';
import { UsersFetchOptions, UsersSearchOptions, UsersFetchResult, UserRole } from './types/userTypes';

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
