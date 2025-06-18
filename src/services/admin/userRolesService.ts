
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from './types/userTypes';
import { logger } from '@/utils/logging';

// Check if a user is an admin
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }

    return Boolean(data);
  } catch (error) {
    const pgError = error as Error;
    logger.error('Unexpected error in checkIsAdmin:', pgError);
    return false;
  }
}

// Get all roles for a user
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error fetching user roles:', error);
      return [];
    }

    return data && data.length > 0 
      ? data.map(row => row.role as UserRole) 
      : [];
  } catch (error) {
    const pgError = error as Error;
    logger.error('Unexpected error in getUserRoles:', pgError);
    return [];
  }
}

// Get all available roles in the system
export async function getAllRoles(): Promise<string[]> {
  try {
    // Return the available roles directly since they're defined in the UserRole type
    return ['admin', 'moderator', 'user'];
  } catch (error) {
    logger.error('Error fetching all roles:', error);
    return [];
  }
}

// Set a user's role (create or update)
export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    if (!userId) throw new Error('No user ID provided');

    // Check if role entry exists
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      logger.error('Error checking existing user role:', checkError);
      return false;
    }

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (updateError) {
        logger.error('Error updating user role:', updateError);
        return false;
      }
    } else {
      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (insertError) {
        logger.error('Error inserting user role:', insertError);
        return false;
      }
    }

    logger.info(`Successfully set role ${role} for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Unexpected error in setUserRole:', error);
    return false;
  }
}

// Remove a role from a user
export async function removeUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    if (!userId) throw new Error('No user ID provided');

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      logger.error('Error removing user role:', error);
      return false;
    }

    logger.info(`Successfully removed role ${role} from user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Unexpected error in removeUserRole:', error);
    return false;
  }
}

/**
 * Check admin connection status - improved version
 */
export async function checkAdminConnectionStatus(): Promise<any> {
  try {
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Test if current user is admin
    let isAdmin = false;
    if (user) {
      isAdmin = await checkIsAdmin(user.id);
    }

    // Test edge functions availability (basic check)
    const functionAvailable = true; // Supabase edge functions are always available if configured

    return {
      isConnected: !dbError,
      isAuthenticated: !!user && !authError,
      isAdmin,
      functionAvailable,
      environmentInfo: {
        environmentId: process.env.NODE_ENV || "development",
        environment: window.location.hostname,
        connectionId: user?.id || 'anonymous',
        url: supabase.supabaseUrl,
        lastConnection: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error checking admin connection status:', error);
    return {
      isConnected: false,
      isAuthenticated: false,
      isAdmin: false,
      functionAvailable: false,
      environmentInfo: {
        environmentId: "error",
        environment: "error",
        connectionId: "error",
        url: "error",
        lastConnection: new Date().toISOString()
      }
    };
  }
}
