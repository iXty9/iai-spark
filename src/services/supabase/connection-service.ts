
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { getStoredConfig, getDefaultConfig, hasStoredConfig, clearConfig } from '@/config/supabase-config';
import { logger } from '@/utils/logging';

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
const CONNECTION_ID_KEY = 'supabase_connection_id';
const LAST_CONNECTION_TIME_KEY = 'supabase_last_connection';
const ENVIRONMENT_KEY = 'supabase_environment';

/**
 * Get the Supabase client instance, creating it if needed
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    // Generate a unique connection ID for this instance if one doesn't exist
    if (!localStorage.getItem(CONNECTION_ID_KEY)) {
      const connectionId = `conn_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(CONNECTION_ID_KEY, connectionId);
      
      // Store environment info for debugging
      const hostname = window.location.hostname;
      localStorage.setItem(ENVIRONMENT_KEY, hostname);
      
      logger.info(`Generating new connection ID: ${connectionId} for ${hostname}`, {
        module: 'supabase-connection'
      });
    }
    
    const connectionId = localStorage.getItem(CONNECTION_ID_KEY);
    const environment = localStorage.getItem(ENVIRONMENT_KEY) || window.location.hostname;
    
    // Check for force_init parameter - don't initialize client if forcing init
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    const resetConfig = urlParams.get('reset_config') === 'true';
    
    if (resetConfig) {
      clearConfig();
      logger.info('Configuration reset requested via URL parameter', {
        module: 'supabase'
      });
      return null;
    }
    
    if (forceInit) {
      logger.info('Force init parameter detected, not initializing Supabase client', {
        module: 'supabase'
      });
      return null;
    }
    
    // ALWAYS prioritize stored configuration if it exists
    const storedConfig = getStoredConfig();
    
    if (storedConfig) {
      // Use stored configuration (this should work across different development environments)
      logger.info(`Using stored Supabase configuration for connection ${connectionId} on ${environment}`, {
        module: 'supabase',
        custom: true,
        url: storedConfig.url
      });
      
      // Create and initialize the Supabase client with stored config
      supabaseInstance = createClient<Database>(storedConfig.url, storedConfig.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          debug: process.env.NODE_ENV === 'development'
        }
      });
      
      // Record last connection time
      localStorage.setItem(LAST_CONNECTION_TIME_KEY, new Date().toISOString());
      
      return supabaseInstance;
    }
    
    // If no stored config is available, only use default config as fallback in development
    if (process.env.NODE_ENV === 'development') {
      const defaultConfig = getDefaultConfig();
      logger.warn(`No stored config found for ${environment}, using default config as fallback for connection ${connectionId}`, {
        module: 'supabase'
      });
      
      // Create client with default config, but only in development
      supabaseInstance = createClient<Database>(defaultConfig.url, defaultConfig.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          debug: true
        }
      });
      
      // Record last connection time
      localStorage.setItem(LAST_CONNECTION_TIME_KEY, new Date().toISOString());
      
      return supabaseInstance;
    }
    
    // In production with no config, show error
    throw new Error(`No Supabase configuration available for ${environment}`);
  } catch (error) {
    logger.error('Failed to initialize Supabase client', error);
    toast({
      title: 'Connection Error',
      description: 'Could not connect to database. Please check configuration.',
      variant: 'destructive'
    });
    
    // Return null instead of potentially invalid instance
    return null;
  }
}

/**
 * Test a Supabase connection with the given URL and key
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    const testClient = createClient(url, anonKey);
    
    // Try to make a simple query to test the connection
    const { error } = await testClient
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If we got a 404, the table might not exist but the connection is fine
    if (error && error.code !== '42P01') {
      logger.error('Failed to test Supabase connection', error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error testing Supabase connection', error);
    return false;
  }
}

/**
 * Reset the Supabase client instance
 * This is useful when the configuration changes
 */
export function resetSupabaseClient() {
  logger.info('Resetting Supabase client instance', {
    module: 'supabase'
  });
  
  supabaseInstance = null;
}

/**
 * Get current connection information for debugging
 */
export function getConnectionInfo() {
  const connectionId = localStorage.getItem(CONNECTION_ID_KEY) || 'not_set';
  const environment = localStorage.getItem(ENVIRONMENT_KEY) || window.location.hostname;
  const lastConnection = localStorage.getItem(LAST_CONNECTION_TIME_KEY) || 'never';
  const storedConfig = getStoredConfig();
  
  return {
    connectionId,
    environment,
    lastConnection,
    hasStoredConfig: !!storedConfig,
    url: storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config'
  };
}
