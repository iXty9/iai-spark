
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
      
      // Execute the SQL directly to create the function
      const { error: createError } = await adminClient.from('_exec_sql_setup_')
        .select('*')
        .limit(1)
        .then(() => {
          return { error: null }; // Just to match expected return structure
        })
        .catch(async () => {
          // Direct SQL execution fallback
          const { error } = await adminClient.query(createFunctionSql);
          return { error };
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
 * Split SQL into separate statements to avoid issues with complex scripts
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
    
    // Split the SQL script into separate statements
    // This helps avoid syntax errors in complex scripts
    const statements = splitSqlIntoStatements(sql);
    logger.info(`Split SQL into ${statements.length} statements`, { module: 'init' });
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue; // Skip empty statements
      
      try {
        // Execute the SQL statement using RPC
        const { error } = await adminClient.rpc('exec_sql', { sql: statement });
        
        if (error) {
          logger.error(`SQL execution failed at statement ${i+1}/${statements.length}`, { 
            module: 'init',
            error: error.message,
            details: error.details,
            hint: error.hint,
            statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
          
          return { 
            success: false, 
            error: `SQL execution failed at statement ${i+1}: ${error.message}` 
          };
        }
      } catch (stmtError: any) {
        logger.error(`Exception executing SQL statement ${i+1}/${statements.length}`, {
          module: 'init',
          error: stmtError.message,
          statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
        });
        
        return {
          success: false,
          error: `SQL execution error at statement ${i+1}: ${stmtError.message || 'Unknown error'}`
        };
      }
    }
    
    logger.info('All SQL statements executed successfully', { module: 'init' });
    return { success: true };
    
  } catch (error: any) {
    logger.error('Error during SQL execution', error);
    return {
      success: false,
      error: `SQL execution error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Split a SQL script into separate statements
 * This handles statements terminated by semicolons, but preserves 
 * semicolons within functions, strings, etc.
 */
function splitSqlIntoStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inFunction = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    // Handle string literals
    if (char === "'" && !escaped) {
      inString = !inString;
    }
    
    // Handle escape characters within strings
    if (char === '\\' && inString) {
      escaped = !escaped;
    } else {
      escaped = false;
    }
    
    // Handle function bodies
    if (!inString) {
      if (char === '$' && nextChar === '$') {
        inFunction = inFunction ? 0 : 1;
      }
    }
    
    // Add character to current statement
    currentStatement += char;
    
    // Check for statement end
    if (char === ';' && !inString && !inFunction) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }
  
  // Add the last statement if it doesn't end with a semicolon
  if (currentStatement.trim()) {
    statements.push(currentStatement);
  }
  
  return statements;
}
