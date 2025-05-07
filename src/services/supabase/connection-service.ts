
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { getStoredConfig, getDefaultConfig, hasStoredConfig, clearConfig, getEnvironmentId } from '@/config/supabase-config';
import { logger } from '@/utils/logging';
import { fetchConnectionConfig } from '@/services/admin/settingsService';

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
const CONNECTION_ID_KEY = 'supabase_connection_id';
const LAST_CONNECTION_TIME_KEY = 'supabase_last_connection';
const ENVIRONMENT_KEY = 'supabase_environment';

// Store current environment with connection
function getConnectionKey(key: string): string {
  const envId = getEnvironmentId();
  return `${key}_${envId}`;
}

/**
 * Get the Supabase client instance, creating it if needed
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    // Generate a unique connection ID for this instance if one doesn't exist
    const connIdKey = getConnectionKey(CONNECTION_ID_KEY);
    if (!localStorage.getItem(connIdKey)) {
      const connectionId = `conn_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(connIdKey, connectionId);
      
      // Store environment info for debugging
      const hostname = window.location.hostname;
      localStorage.setItem(getConnectionKey(ENVIRONMENT_KEY), hostname);
      
      logger.info(`Generating new connection ID: ${connectionId} for ${hostname}`, {
        module: 'supabase-connection',
        environmentId: getEnvironmentId()
      });
    }
    
    const connectionId = localStorage.getItem(connIdKey);
    const environment = localStorage.getItem(getConnectionKey(ENVIRONMENT_KEY)) || window.location.hostname;
    
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
        url: storedConfig.url ? storedConfig.url.split('//')[1] : 'undefined',
        environmentId: getEnvironmentId()
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
      localStorage.setItem(getConnectionKey(LAST_CONNECTION_TIME_KEY), new Date().toISOString());
      
      return supabaseInstance;
    }
    
    // If no stored config is available in localStorage, try to fetch from database
    // This is an async operation but should be fast
    fetchConnectionConfig().then(dbConfig => {
      if (dbConfig) {
        logger.info(`Found connection configuration in database for ${environment}`, {
          module: 'supabase',
          url: dbConfig.url.split('//')[1], // Log domain only for security
          lastConnection: dbConfig.lastConnection || 'unknown',
          environmentId: getEnvironmentId()
        });
        
        // Store config in localStorage for future use
        const config = {
          url: dbConfig.url,
          anonKey: dbConfig.anonKey,
          serviceKey: dbConfig.serviceKey,
          isInitialized: dbConfig.isInitialized,
          savedAt: new Date().toISOString(),
          environment: window.location.hostname
        };
        
        // Save to localStorage
        const configKey = getConnectionKey('spark_supabase_config');
        localStorage.setItem(configKey, JSON.stringify(config));
        
        // Reset supabase client to use new config
        resetSupabaseClient();
        
        // Reload the page to use the new config
        window.location.reload();
      }
    }).catch(error => {
      logger.error('Error fetching connection config from database:', error, { 
        module: 'supabase',
        environmentId: getEnvironmentId()
      });
    });
    
    // If no stored config is available, only use default config as fallback in development
    if (process.env.NODE_ENV === 'development') {
      const defaultConfig = getDefaultConfig();
      logger.warn(`No stored config found for ${environment}, using default config as fallback for connection ${connectionId}`, {
        module: 'supabase',
        environmentId: getEnvironmentId()
      });
      
      // Create client with default config, but only in development
      if (defaultConfig.url && defaultConfig.anonKey) {
        supabaseInstance = createClient<Database>(defaultConfig.url, defaultConfig.anonKey, {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
            debug: true
          }
        });
        
        // Record last connection time
        localStorage.setItem(getConnectionKey(LAST_CONNECTION_TIME_KEY), new Date().toISOString());
        
        return supabaseInstance;
      } else {
        logger.warn('Default config is incomplete (missing URL or anonKey)', { 
          module: 'supabase',
          environmentId: getEnvironmentId()
        });
      }
    }
    
    // In production with no config, show error
    throw new Error(`No Supabase configuration available for ${environment} (env: ${getEnvironmentId()})`);
  } catch (error) {
    logger.error('Failed to initialize Supabase client', error);
    toast({
      title: 'Connection Error',
      description: 'Could not connect to database. Please check configuration.',
      variant: 'destructive',
      action: {
        altText: "Reconnect",
        onClick: () => window.location.href = '/supabase-auth'
      }
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
    module: 'supabase',
    environmentId: getEnvironmentId()
  });
  
  supabaseInstance = null;
}

/**
 * Get current connection information for debugging
 */
export function getConnectionInfo() {
  const connIdKey = getConnectionKey(CONNECTION_ID_KEY);
  const envKey = getConnectionKey(ENVIRONMENT_KEY);
  const lastConnKey = getConnectionKey(LAST_CONNECTION_TIME_KEY);
  
  const connectionId = localStorage.getItem(connIdKey) || 'not_set';
  const environment = localStorage.getItem(envKey) || window.location.hostname;
  const lastConnection = localStorage.getItem(lastConnKey) || 'never';
  const storedConfig = getStoredConfig();
  
  return {
    connectionId,
    environment,
    environmentId: getEnvironmentId(),
    lastConnection,
    hasStoredConfig: !!storedConfig,
    url: storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config'
  };
}
