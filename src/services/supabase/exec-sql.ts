
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

/**
 * Create the exec_sql function if it doesn't exist
 * 
 * @param url Supabase URL
 * @param serviceKey Service Role Key with admin privileges
 */
export async function createExecSqlFunction(
  url: string, 
  serviceKey: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    logger.info('Checking and creating exec_sql function', { module: 'init' });
    
    // Create admin client with service key
    const adminClient = createClient(url, serviceKey);
    
    // SQL to create the exec_sql function if it doesn't exist
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    try {
      // First try to use the function to see if it exists
      try {
        // Try to call the function if it exists
        const { error } = await adminClient.rpc('exec_sql', { sql: 'SELECT 1' });
        
        if (!error) {
          // Function exists and works
          logger.info('Exec_sql function is available', { module: 'init' });
          return { success: true };
        }
        
        // If we get here, function might exist but has an issue
        logger.warn('Exec_sql function exists but may have issues, attempting to recreate', { module: 'init' });
      } catch (error: any) {
        // Function doesn't exist, we'll create it
        logger.info('The exec_sql function does not exist, creating it now', { module: 'init' });
      }
      
      // Use the rpc method to create the function
      const { error: createError } = await adminClient.rpc('exec_sql_setup', { setup_sql: createFunctionSql }).catch(() => {
        // If rpc fails, try direct query as fallback
        return adminClient.from('_exec_sql_setup_').select('*').limit(1).then(() => ({ error: new Error('Function creation failed') }));
      });
      
      if (createError) {
        logger.error('Error creating exec_sql function:', createError, { module: 'init' });
        return { 
          success: false, 
          error: `Failed to create exec_sql function: ${createError.message || 'Unknown error'}` 
        };
      }
      
      logger.info('Successfully created exec_sql function', { module: 'init' });
      return { success: true };
      
    } catch (error: any) {
      logger.error('Unexpected error checking/creating exec_sql function:', error, { module: 'init' });
      return {
        success: false,
        error: `Error creating exec_sql function: ${error.message || 'Unknown error'}`
      };
    }
  } catch (error: any) {
    logger.error('Failed to connect to Supabase to check/create exec_sql function:', error);
    return { 
      success: false, 
      error: `Connection error: ${error.message || 'Unknown error'}` 
    };
  }
}

/**
 * Execute SQL script on a Supabase database
 * 
 * @param url Supabase URL
 * @param serviceKey Service Role Key with admin privileges
 * @param sql SQL script to execute
 */
export async function execSql(
  url: string, 
  serviceKey: string, 
  sql: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    logger.info('Executing SQL query', { module: 'init', sqlLength: sql.length });
    
    // Create admin client with service key
    const adminClient = createClient(url, serviceKey);
    
    // First check/create the exec_sql function
    const functionResult = await createExecSqlFunction(url, serviceKey);
    if (!functionResult.success) {
      return functionResult;
    }
    
    // Execute the SQL script using RPC
    const { error } = await adminClient.rpc('exec_sql', { sql });
    
    if (error) {
      logger.error('SQL execution failed', { 
        module: 'init',
        error: error.message,
        details: error.details,
        hint: error.hint
      });
      
      return { 
        success: false, 
        error: `SQL execution failed: ${error.message}` 
      };
    }
    
    logger.info('SQL executed successfully', { module: 'init' });
    return { success: true };
    
  } catch (error: any) {
    logger.error('Error during SQL execution', error);
    return {
      success: false,
      error: `SQL execution error: ${error.message || 'Unknown error'}`
    };
  }
}
