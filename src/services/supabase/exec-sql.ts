
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
      // Execute SQL to create the function
      const { error } = await adminClient.rpc('exec_sql', { sql: createFunctionSql });
      
      // If we get an error that the function doesn't exist, we need to create it manually
      if (error && error.message.includes('function exec_sql(text) does not exist')) {
        logger.info('The exec_sql function does not exist, creating manually', { module: 'init' });
        
        // Create the function using direct SQL query
        const { error: directError } = await adminClient.sql(createFunctionSql);
        
        if (directError) {
          logger.error('Error creating exec_sql function directly:', directError, { module: 'init' });
          return { 
            success: false, 
            error: `Failed to create exec_sql function: ${directError.message}` 
          };
        }
        
        logger.info('Successfully created exec_sql function', { module: 'init' });
        return { success: true };
      } else if (error) {
        // Some other error occurred
        logger.error('Error checking exec_sql function:', error, { module: 'init' });
        return { 
          success: false, 
          error: `Error checking exec_sql function: ${error.message}` 
        };
      }
      
      // Function already existed and was successfully called (or it was just created)
      logger.info('Exec_sql function is available', { module: 'init' });
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
    
    // Execute the SQL script
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
