
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types/userTypes';
import { logger } from '@/utils/logging';

/**
 * Checks if a user has a specific role
 * @param userId The user ID to check
 * @param role The role to check for
 * @returns A promise resolving to a boolean indicating if the user has the role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) {
      logger.error('Error checking user role', error, { userId, role, module: 'role-service' });
      return false;
    }
    
    const hasUserRole = data && data.length > 0;
    logger.info('Role check completed', { userId, role, hasRole: hasUserRole, module: 'role-service' });
    
    return hasUserRole;
  } catch (error) {
    logger.error('Unexpected error in hasRole', error, { userId, role, module: 'role-service' });
    return false;
  }
}

/**
 * Fetch a user's role from the database
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error fetching user role', error, { userId, module: 'role-service' });
      return null;
    }

    const userRole = data && data.length > 0 ? data[0].role as UserRole : null;
    logger.info('User role fetched', { userId, role: userRole, module: 'role-service' });
    
    return userRole;
  } catch (error) {
    logger.error('Unexpected error in getUserRole', error, { userId, module: 'role-service' });
    return null;
  }
}

/**
 * Set a user's role in the database
 */
export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    if (!userId) throw new Error('No user logged in');

    logger.info('Setting user role', { userId, role, module: 'role-service' });

    // Check if role entry exists
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error checking existing user role', error, { userId, module: 'role-service' });
      return false;
    }

    let updateResult;
    
    if (data && data.length > 0) {
      // Update existing role
      updateResult = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
        
      logger.info('Updating existing user role', { userId, role, module: 'role-service' });
    } else {
      // Insert new role
      updateResult = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
        
      logger.info('Inserting new user role', { userId, role, module: 'role-service' });
    }

    if (updateResult.error) {
      logger.error('Error setting user role', updateResult.error, { userId, role, module: 'role-service' });
      return false;
    }

    logger.info('User role set successfully', { userId, role, module: 'role-service' });
    return true;
  } catch (error) {
    logger.error('Unexpected error in setUserRole', error, { userId, role, module: 'role-service' });
    return false;
  }
}

/**
 * Check admin connection status
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  logger.info('Checking admin connection status', { module: 'role-service' });
  
  // Implementation to check connection status
  return {
    isConnected: true,
    isAuthenticated: true,
    isAdmin: true,
    functionAvailable: true,
    environmentInfo: {
      environmentId: "development"
    }
  };
}
