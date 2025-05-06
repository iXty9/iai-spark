
import { createClient } from '@supabase/supabase-js';
import { getAllInitScripts } from './init-scripts';
import { logger } from '@/utils/logging';
import { saveConfig, SupabaseConfig } from '@/config/supabase-config';
import { resetSupabaseClient } from './connection-service';

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
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Starting Supabase database initialization', { module: 'init' });
    
    // Create admin client with the service key
    const adminClient = createClient(url, serviceKey);
    
    // Get all initialization scripts
    const scripts = getAllInitScripts();
    
    // Execute each script sequentially
    for (const script of scripts) {
      const { error } = await adminClient.rpc('exec_sql', { sql: script });
      
      if (error) {
        logger.error('Error executing initialization script', { 
          module: 'init', 
          error: error.message, 
          details: error.details,
          hint: error.hint,
          script: script.substring(0, 100) + '...'
        });
        
        return { 
          success: false, 
          error: `Database initialization failed: ${error.message}` 
        };
      }
    }
    
    // Save the configuration if initialization succeeded
    const config: SupabaseConfig = { url, anonKey, isInitialized: true };
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
    
    // Configuration should already be saved from the previous step,
    // but we can verify it's there and re-save if needed
    
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
