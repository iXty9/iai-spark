
import { createClient } from '@supabase/supabase-js';
import { getAllInitScripts } from './init-scripts';
import { logger } from '@/utils/logging';
import { saveConfig, SupabaseConfig } from '@/config/supabase-config';
import { resetSupabaseClient } from './connection-service';
import { createExecSqlFunction, execSql } from './exec-sql';

/**
 * Initialize a new Supabase database with required schema
 * @param url The Supabase URL
 * @param serviceKey The Supabase service key (with full admin privileges)
 * @param anonKey The Supabase anon key (for client use)
 */
export async function initializeSupabaseDb(
  url: string,
  serviceKey: string,
  anonKey: string
): Promise<{ success: boolean; error?: string; reconnected?: boolean; detail?: string }> {
  try {
    logger.info('Starting Supabase database initialization', { module: 'init' });
    
    // Create admin client with the service key
    const adminClient = createClient(url, serviceKey);
    
    // First, check if database is already initialized with required structures
    const checkResult = await checkIfDatabaseInitialized(adminClient);
    
    if (checkResult.isInitialized) {
      logger.info('Database already appears to be initialized, performing connection only', { 
        module: 'init',
        tables: checkResult.existingTables
      });
      
      // Skip initialization scripts but still save the configuration
      const config: SupabaseConfig = { 
        url, 
        anonKey, 
        serviceKey, // Store service key for self-healing operations
        isInitialized: true 
      };
      
      const saved = saveConfig(config);
      
      if (!saved) {
        return {
          success: false,
          error: "Configuration couldn't be saved locally, but database appears to be already initialized"
        };
      }
      
      // Reset client to use new configuration
      resetSupabaseClient();
      
      logger.info('Connected successfully to existing initialized database', { module: 'init' });
      return { 
        success: true, 
        reconnected: true,
        detail: 'Connected to existing database. Your configuration has been updated.' 
      };
    }
    
    // If not initialized, create the exec_sql function
    const funcResult = await createExecSqlFunction(url, serviceKey);
    if (!funcResult.success) {
      return funcResult;
    }
    
    // Get all initialization scripts
    const scripts = getAllInitScripts();
    
    // Execute each script sequentially
    for (const script of scripts) {
      // Skip problematic scripts if database appears partially initialized
      if (checkResult.partialInit && containsProblemSyntax(script)) {
        logger.info('Skipping potentially conflicting script during reconnection', { 
          module: 'init',
          scriptPreview: script.substring(0, 100)
        });
        continue;
      }
      
      const result = await execSql(url, serviceKey, script);
      if (!result.success) {
        return result;
      }
    }
    
    // Save the configuration if initialization succeeded
    const config: SupabaseConfig = { 
      url, 
      anonKey, 
      serviceKey, // Store service key for self-healing operations
      isInitialized: true 
    };
    const saved = saveConfig(config);
    
    if (!saved) {
      return {
        success: false,
        error: "Database was initialized but configuration couldn't be saved locally"
      };
    }
    
    // Reset client to use new configuration
    resetSupabaseClient();
    
    logger.info('Supabase database initialization completed successfully', { module: 'init' });
    return { success: true };
    
  } catch (error: any) {
    logger.error('Unexpected error during Supabase initialization', error);
    return { 
      success: false, 
      error: `Initialization failed: ${error.message || 'Unknown error'}` 
    };
  }
}

/**
 * Check if the database is already initialized by checking for key tables
 */
async function checkIfDatabaseInitialized(client: any): Promise<{
  isInitialized: boolean;
  partialInit: boolean;
  existingTables: string[];
}> {
  try {
    // Tables to check for initialization status
    const requiredTables = ['profiles', 'user_roles', 'app_settings'];
    const existingTables: string[] = [];
    
    // Check each table
    for (const table of requiredTables) {
      try {
        const { error } = await client.from(table).select('id').limit(1);
        
        // If no error or error is not a "table doesn't exist" error, consider table exists
        if (!error || error.code !== '42P01') {
          existingTables.push(table);
        }
      } catch (err) {
        logger.debug(`Error checking table ${table}:`, err);
      }
    }
    
    const isInitialized = existingTables.length === requiredTables.length;
    const partialInit = existingTables.length > 0 && !isInitialized;
    
    logger.info('Database initialization check:', { 
      isInitialized, 
      partialInit,
      existingTables,
      module: 'init' 
    });
    
    return { isInitialized, partialInit, existingTables };
  } catch (err) {
    logger.error('Error checking database initialization status:', err);
    return { isInitialized: false, partialInit: false, existingTables: [] };
  }
}

/**
 * Check if SQL script contains problematic syntax that might cause errors 
 * when executed against an existing database
 */
function containsProblemSyntax(sql: string): boolean {
  // Check for array indexing syntax that caused the error
  if (sql.includes('storage.foldername(name)[1]')) {
    return true;
  }
  
  // Add more checks as needed for other problematic syntax
  return false;
}

/**
 * Create the first admin user for a newly initialized database
 */
export async function createInitialAdmin(
  email: string, 
  password: string,
  username: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Creating initial admin user', { module: 'init', email, username });
    
    // Create admin client with the service key
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // 1. Create the user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    });
    
    if (createError || !userData?.user) {
      return { 
        success: false, 
        error: `Failed to create admin user: ${createError?.message || 'Unknown error'}` 
      };
    }
    
    // 2. Add admin role to the user
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin'
      });
    
    if (roleError) {
      return { 
        success: false, 
        error: `Created user but failed to add admin role: ${roleError.message}` 
      };
    }
    
    logger.info('Initial admin user created successfully', { module: 'init', userId: userData.user.id });
    return { success: true };
    
  } catch (error: any) {
    logger.error('Error creating initial admin user', error);
    return { 
      success: false, 
      error: `Failed to create admin user: ${error.message || 'Unknown error'}` 
    };
  }
}
