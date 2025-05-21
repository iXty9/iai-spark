import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Check if the current user has admin permissions
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const client = await supabase;
    if (!client) return false;
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    // Check if user has admin flag in profiles
    const { data: profile, error } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (error || !profile) return false;
    return !!profile.is_admin;
  } catch (err) {
    logger.error('Error checking admin status', err);
    return false;
  }
}

/**
 * Invoke an edge function with authentication
 */
export async function invokeAuthenticatedFunction(functionName: string, payload: any): Promise<any> {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client.functions.invoke(functionName, {
      body: payload
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    logger.error(`Error invoking function ${functionName}`, err);
    throw err;
  }
}

// Helper function to invoke admin-users edge function
export async function invokeAdminFunction(action: string, params: any = {}): Promise<any> {
  try {
    // Get the current session
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    
    if (!session) {
      throw new Error('No active session');
    }

    // Check if functions property exists before calling invoke
    if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
      logger.error(`Supabase functions API is not available`, { module: 'roles' });
      throw new Error('Supabase functions API is not available');
    }

    // Invoke the edge function with safe error handling
    try {
      const response = await supabase.functions.invoke('admin-users', {
        body: { action, params },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (!response) {
        throw new Error(`No response from admin-users function (${action})`);
      }
      
      // Use in operator to safely check for error property
      if (response && 'error' in response && response.error) {
        logger.error(`Error invoking admin-users function (${action}):`, response.error, { module: 'roles' });
        throw response.error;
      }

      // Safely return data if it exists
      return response && 'data' in response ? response.data : null;
    } catch (err) {
      logger.error(`Error in supabase.functions.invoke:`, err, { module: 'roles' });
      throw err;
    }
  } catch (error) {
    logger.error(`Error in admin function call (${action}):`, error, { module: 'roles' });
    throw error;
  }
}

/**
 * Call a Supabase Edge Function with proper error handling
 */
export async function callAdminFunction<T = any>(
  functionName: string,
  payload?: any
): Promise<T> {
  try {
    // Use our helper to get the client safely
    return await withSupabase(async (client) => {
      const { data, error } = await client.functions.invoke(functionName, {
        body: payload
      });

      if (error) {
        throw error;
      }

      return data;
    });
  } catch (error) {
    logger.error(`Error calling admin function ${functionName}`, error);
    throw error;
  }
}

/**
 * Check if the current user has admin access
 */
export async function checkAdminAccess(): Promise<boolean> {
  try {
    // Use our helper to get the client safely
    return await withSupabase(async (client) => {
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      const { data: roleData } = await client.functions.invoke('check-admin-access');
      return !!roleData?.isAdmin;
    });
  } catch (error) {
    logger.error('Error checking admin access', error);
    return false;
  }
}
