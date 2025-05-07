import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { getStoredConfig, getDefaultConfig, hasStoredConfig, clearConfig, getEnvironmentId } from '@/config/supabase-config';
import { logger } from '@/utils/logging';
import { fetchConnectionConfig } from '@/services/admin/settingsService';
import { fetchBootstrapConfig } from '@/services/supabase/bootstrap-service';
import { loadSiteEnvironmentConfig } from '@/services/supabase/site-config-service';

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
const CONNECTION_ID_KEY = 'supabase_connection_id';
const LAST_CONNECTION_TIME_KEY = 'supabase_last_connection';
const ENVIRONMENT_KEY = 'supabase_environment';
const BOOTSTRAP_RETRY_COUNT_KEY = 'supabase_bootstrap_retry_count';
const MAX_BOOTSTRAP_RETRIES = 3;

// Store current environment with connection
function getConnectionKey(key: string): string {
  const envId = getEnvironmentId();
  return `${key}_${envId}`;
}

/**
 * Public endpoint to check if default bootstrap config should be tried
 * This is used in server-side rendered environments to avoid infinite loops
 */
export async function checkPublicBootstrapConfig() {
  // Check URL parameters for public bootstrap configs
  const urlParams = new URLSearchParams(window.location.search);
  const publicUrl = urlParams.get('public_url');
  const publicKey = urlParams.get('public_key');
  
  if (publicUrl && publicKey) {
    logger.info('Found public bootstrap config in URL parameters', {
      module: 'supabase-connection'
    });
    
    try {
      // Attempt to use these credentials to bootstrap the connection
      const bootstrapConfig = await fetchBootstrapConfig(publicUrl, publicKey);
      
      if (bootstrapConfig) {
        logger.info('Successfully bootstrapped connection from URL parameters', {
          module: 'supabase-connection'
        });
        
        // Save the bootstrapped config to localStorage
        saveConfig({
          url: bootstrapConfig.url,
          anonKey: bootstrapConfig.anonKey,
          serviceKey: bootstrapConfig.serviceKey,
          isInitialized: bootstrapConfig.isInitialized
        });
        
        // Reset the Supabase client to use the new config
        resetSupabaseClient();
        
        return true;
      }
    } catch (error) {
      logger.error('Failed to bootstrap connection from URL parameters', error, {
        module: 'supabase-connection'
      });
    }
  }

  // Next, try to load from site environment config if no URL parameters are found
  try {
    const defaultConfig = getDefaultConfig();
    
    // Only try to load site config if we have a default config to use temporarily
    if (defaultConfig.url && defaultConfig.anonKey) {
      logger.info('Attempting to load site environment config', {
        module: 'supabase-connection'
      });
      
      const siteConfig = await loadSiteEnvironmentConfig(
        defaultConfig.url, 
        defaultConfig.anonKey
      );
      
      if (siteConfig) {
        logger.info('Successfully loaded site environment config', {
          module: 'supabase-connection',
          host: siteConfig.siteHost
        });
        
        // Save the site config to localStorage
        saveConfig({
          url: siteConfig.supabaseUrl,
          anonKey: siteConfig.supabaseAnonKey,
          isInitialized: true
        });
        
        // Reset the Supabase client to use the new config
        resetSupabaseClient();
        
        return true;
      }
    }
  } catch (error) {
    logger.error('Error loading site environment config', error, {
      module: 'supabase-connection'
    });
  }
  
  return false;
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
        module: 'supabase-connection'
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
        url: storedConfig.url ? storedConfig.url.split('//')[1] : 'undefined'
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
    
    // If no stored config is available, try to bootstrap from default config
    // This should happen only on the first visit from a new device
    tryBootstrapFromDefault().catch(error => {
      logger.error('Failed to bootstrap from default config', error, {
        module: 'supabase'
      });
    });
    
    // If no stored config is available, use default config as fallback in development
    if (process.env.NODE_ENV === 'development') {
      const defaultConfig = getDefaultConfig();
      logger.warn(`No stored config found for ${environment}, using default config as fallback for connection ${connectionId}`, {
        module: 'supabase'
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
          module: 'supabase'
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
 * Try to bootstrap from default config stored in the database
 * This runs as a background operation to avoid blocking the UI
 * Now enhanced to also check site environment configuration
 */
async function tryBootstrapFromDefault() {
  // Check if we've already tried too many times this session
  const retryCountKey = getConnectionKey(BOOTSTRAP_RETRY_COUNT_KEY);
  const retryCount = parseInt(localStorage.getItem(retryCountKey) || '0', 10);
  
  if (retryCount >= MAX_BOOTSTRAP_RETRIES) {
    logger.warn('Max bootstrap retry count reached, aborting', {
      module: 'supabase-bootstrap',
      // Removed retryCount property from log options
    });
    return;
  }
  
  // Increment and save the retry count
  localStorage.setItem(retryCountKey, (retryCount + 1).toString());
  
  // Get default config for bootstrap attempt
  const defaultConfig = getDefaultConfig();
  
  // If default config isn't available, we can't bootstrap
  if (!defaultConfig.url || !defaultConfig.anonKey) {
    logger.warn('Default config is incomplete, cannot bootstrap', {
      module: 'supabase-bootstrap'
    });
    return;
  }
  
  try {
    logger.info('Attempting to bootstrap from default config', {
      module: 'supabase-bootstrap'
    });
    
    // NEW: First try loading from site environment config
    try {
      const siteConfig = await loadSiteEnvironmentConfig(
        defaultConfig.url,
        defaultConfig.anonKey
      );
      
      if (siteConfig) {
        logger.info('Successfully bootstrapped from site environment config', {
          module: 'supabase-bootstrap',
          host: siteConfig.siteHost
        });
        
        // Save to localStorage for future use
        saveConfig({
          url: siteConfig.supabaseUrl,
          anonKey: siteConfig.supabaseAnonKey,
          isInitialized: true
        });
        
        // Reset client to use new config
        resetSupabaseClient();
        
        // Reload the page to use the new config
        window.location.reload();
        return;
      }
    } catch (error) {
      logger.error('Error loading from site environment config', error, {
        module: 'supabase-bootstrap'
      });
      // Continue to try other bootstrap methods
    }
    
    // Try to use the default config to fetch stored settings from the database
    const bootstrapConfig = await fetchBootstrapConfig(
      defaultConfig.url,
      defaultConfig.anonKey
    );
    
    // If we found a stored config, save it to localStorage
    if (bootstrapConfig) {
      logger.info('Successfully bootstrapped from default config', {
        module: 'supabase-bootstrap',
        url: bootstrapConfig.url.split('//')[1]
      });
      
      // Save to localStorage for future use
      saveConfig({
        url: bootstrapConfig.url,
        anonKey: bootstrapConfig.anonKey,
        serviceKey: bootstrapConfig.serviceKey,
        isInitialized: bootstrapConfig.isInitialized
      });
      
      // Reset client to use new config
      resetSupabaseClient();
      
      // Reload the page to use the new config
      window.location.reload();
    } else {
      logger.warn('No stored configuration found during bootstrap attempt', {
        module: 'supabase-bootstrap'
      });
    }
  } catch (error) {
    logger.error('Error during bootstrap attempt', error, {
      module: 'supabase-bootstrap'
    });
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

/**
 * Save configuration to localStorage
 * Added here to avoid circular dependencies
 */
function saveConfig(config: {
  url: string;
  anonKey: string;
  serviceKey?: string;
  isInitialized?: boolean;
}) {
  try {
    const configKey = getConnectionKey('spark_supabase_config');
    // Add a timestamp and environment info to the saved config
    const configWithMeta = {
      ...config,
      savedAt: new Date().toISOString(),
      environment: window.location.hostname
    };
    
    localStorage.setItem(configKey, JSON.stringify(configWithMeta));
    logger.info('Supabase configuration saved to local storage', {
      module: 'supabase-connection',
      url: config.url ? config.url.split('//')[1] : 'undefined'
    });
    return true;
  } catch (e) {
    logger.error('Error saving Supabase config to local storage', e);
    return false;
  }
}
