import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';

interface LogOptions {
  module: string;
  [key: string]: any;
}

/**
 * Generic admin function wrapper with proper error handling and logging
 */
export const executeAdminFunction = async <T>(
  functionName: string,
  operation: () => Promise<T>,
  options: LogOptions = { module: 'admin-function' }
): Promise<T> => {
  try {
    // Log the function call
    logger.info(`Executing admin function: ${functionName}`, { 
      module: options.module,
      function: functionName,
      ...options
    });
    
    // Execute the provided operation
    const result = await operation();
    
    // Log success
    logger.info(`Admin function executed successfully: ${functionName}`, { 
      module: options.module,
      function: functionName,
      ...options
    });
    
    return result;
  } catch (error) {
    // Log error with details
    logger.error(`Admin function error in ${functionName}:`, error, {
      module: options.module,
      function: functionName,
      ...options
    });
    
    // Rethrow to allow caller to handle
    throw error;
  }
};

/**
 * Execute a Supabase RPC function with proper error handling and logging
 */
export const executeRPC = async <T = any>(
  functionName: string,
  params: Record<string, any> = {},
  options: LogOptions = { module: 'rpc-function' }
): Promise<T> => {
  return executeAdminFunction<T>(
    functionName,
    async () => {
      return await withSupabase(async (client) => {
        const { data, error } = await client.rpc(functionName, params);
        
        if (error) {
          throw error;
        }
        
        return data as T;
      });
    },
    options
  );
};

/**
 * Safely execute a database operation with proper error handling and logging
 */
export const executeDatabaseOperation = async <T = any>(
  operationName: string,
  operation: (client: any) => Promise<T>,
  options: LogOptions = { module: 'database-operation' }
): Promise<T> => {
  return executeAdminFunction<T>(
    operationName,
    async () => {
      return await withSupabase(async (client) => {
        return await operation(client);
      });
    },
    options
  );
};

/**
 * Call an admin edge function
 * @param functionName The name of the function to call
 * @param payload The payload to send to the function
 * @returns 
 */
export const callAdminFunction = async (functionName: string, payload: any) => {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.functions.invoke(functionName, {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        logger.error(`Error calling admin function ${functionName}`, error, {
          module: 'admin-function-utils',
          payload,
        });
        throw error;
      }

      return data;
    });
  } catch (error) {
    logger.error(`Error in callAdminFunction ${functionName}`, error, {
      module: 'admin-function-utils',
      payload,
    });
    throw error;
  }
};

/**
 * Verify current user has admin capabilities
 */
export const verifyAdminUser = async () => {
  try {
    return await withSupabase(async (client) => {
      // Get the current session
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.user) {
        throw new Error('User not authenticated');
      }

      const userId = sessionData.session.user.id;

      // Check if user has admin role
      const { data: roleData, error: roleError } = await client
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (roleError) throw roleError;
      return roleData && roleData.length > 0;
    });
  } catch (error) {
    logger.error('Error verifying admin user', error, { module: 'admin-function-utils' });
    return false;
  }
};

/**
 * Call a Supabase Edge Function with admin permissions
 */
export const callEdgeFunction = async (functionName: string, payload: any = {}, headers: Record<string, string> = {}) => {
  try {
    return await withSupabase(async (client) => {
      // Verify the user has admin rights first
      const isAdmin = await verifyAdminUser();
      if (!isAdmin) {
        throw new Error('Permission denied: Admin access required');
      }

      // Call the function
      const response = await client.functions.invoke(functionName, {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
      });

      if (response.error) {
        throw new Error(`Edge function error: ${response.error.message}`);
      }

      return response.data;
    });
  } catch (error) {
    logger.error(`Error calling edge function ${functionName}`, error, {
      module: 'admin-function-utils',
      payload,
    });
    throw error;
  }
};
