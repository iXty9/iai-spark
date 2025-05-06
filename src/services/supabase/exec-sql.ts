
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

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
