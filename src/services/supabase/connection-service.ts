import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { getStoredConfig, clearConfig, getEnvironmentId, getEnvironmentInfo } from '@/config/supabase-config';
import { logger } from '@/utils/logging';
import { configLoader } from '@/services/supabase/config-loader';
import { ConfigSource } from '@/services/supabase/config-loader-types';

// Client instance and connection tracking
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
const CONNECTION_ID_KEY = 'supabase_connection_id';
const LAST_CONNECTION_TIME_KEY = 'supabase_last_connection';
const ENVIRONMENT_KEY = 'supabase_environment';
const CONNECTION_STATE_KEY = 'supabase_connection_state';

// Connection state tracking
interface ConnectionState {
  lastAttempt: string;
  lastSuccess: string | null;
  attemptCount: number;
  source: string;
  error?: string;
}

// Store current environment with connection
function getConnectionKey(key: string): string {
  const envId = getEnvironmentId();
  return `${key}_${envId}`;
}

/**
 * Public endpoint to check if default bootstrap config should be tried
 * This is used in server-side rendered environments to avoid infinite loops
 * Now uses the unified configuration loader
 */
export async function checkPublicBootstrapConfig() {
  try {
    logger.info('Checking for bootstrap configuration', {
      module: 'supabase-connection'
    });
    
    // Check if this is a first-time user (no previous connection attempts)
    const isFirstTimeUser = !localStorage.getItem(getConnectionKey(LAST_CONNECTION_TIME_KEY));
    
    // For first-time users, we'll be more aggressive with retries
    const maxAttempts = isFirstTimeUser ? 3 : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        // Add a small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
        
        logger.info(`Retry attempt ${attempt} for bootstrap configuration`, {
          module: 'supabase-connection'
        });
      }
      
      // Use the unified configuration loader
      const result = await configLoader.loadConfiguration();
      
      if (result.config) {
        logger.info(`Successfully loaded configuration from ${result.source}`, {
          module: 'supabase-connection'
        });
        
        // Save the configuration
        configLoader.saveConfiguration(result.config);
        
        // Reset the Supabase client to use the new config
        resetSupabaseClient();
        
        // Update connection state
        updateConnectionState({
          lastAttempt: new Date().toISOString(),
          lastSuccess: new Date().toISOString(),
          attemptCount: 1,
          source: result.source
        });
        
        return true;
      }
    }
    
    logger.info('No bootstrap configuration found after attempts', {
      module: 'supabase-connection',
      error: 'Configuration not found'
    });
    
    // Update connection state
    updateConnectionState({
      lastAttempt: new Date().toISOString(),
      lastSuccess: null,
      attemptCount: getConnectionState().attemptCount + 1,
      source: ConfigSource.NONE,
      error: 'Configuration not found after multiple attempts'
    });
    
    return false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error checking bootstrap configuration', error, {
      module: 'supabase-connection'
    });
    
    // Update connection state
    updateConnectionState({
      lastAttempt: new Date().toISOString(),
      lastSuccess: null,
      attemptCount: getConnectionState().attemptCount + 1,
      source: ConfigSource.NONE,
      error: errorMsg
    });
    
    return false;
  }
}

/**
 * Get the Supabase client instance, creating it if needed
 * Now with improved error handling and state management
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
      const envInfo = getEnvironmentInfo();
      localStorage.setItem(getConnectionKey(ENVIRONMENT_KEY), JSON.stringify(envInfo));
      
      logger.info(`Generating new connection ID: ${connectionId}`, {
        module: 'supabase-connection',
        environment: envInfo.id
      });
    }
    
    const connectionId = localStorage.getItem(connIdKey) || 'unknown';
    
    // Check for special URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    const resetConfig = urlParams.get('reset_config') === 'true';
    
    if (resetConfig) {
      clearConfig();
      logger.info('Configuration reset requested via URL parameter', {
        module: 'supabase-connection'
      });
      return null;
    }
    
    if (forceInit) {
      logger.info('Force init parameter detected, not initializing Supabase client', {
        module: 'supabase-connection'
      });
      return null;
    }
    
    // Get stored configuration
    const storedConfig = getStoredConfig();
    
    if (storedConfig && storedConfig.url && storedConfig.anonKey) {
      // Use stored configuration
      logger.info(`Using stored Supabase configuration for connection ${connectionId}`, {
        module: 'supabase-connection',
        url: storedConfig.url.split('//')[1],
        environment: storedConfig.environment || getEnvironmentId()
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
      
      // Update connection state
      updateConnectionState({
        lastAttempt: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        attemptCount: 1,
        source: 'stored_config'
      });
      
      // Check health and attempt repair if needed
      setTimeout(async () => {
        try {
          if (!await checkConnectionHealth()) {
            logger.warn('Connection health check failed, attempting repair', {
              module: 'supabase-connection'
            });
            await attemptConnectionRepair();
          }
        } catch (e) {
          // Don't let this error affect the main flow
          logger.error('Error in connection health check', e, {
            module: 'supabase-connection'
          });
        }
      }, 1000);
      
      return supabaseInstance;
    }
    
    // If no stored config is available, trigger bootstrap in the background
    // This avoids blocking the UI while we try to bootstrap
    setTimeout(() => {
      checkPublicBootstrapConfig().catch(error => {
        logger.error('Failed to bootstrap configuration', error, {
          module: 'supabase-connection'
        });
      });
    }, 0);
    
    // No valid configuration available
    logger.warn('No valid Supabase configuration available', { 
      module: 'supabase-connection',
      connectionId,
      environment: getEnvironmentId()
    });
    
    return null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize Supabase client', error, {
      module: 'supabase-connection'
    });
    
    // Update connection state
    updateConnectionState({
      lastAttempt: new Date().toISOString(),
      lastSuccess: null,
      attemptCount: getConnectionState().attemptCount + 1,
      source: 'error',
      error: errorMsg
    });
    
    toast({
      title: 'Connection Error',
      description: 'Could not connect to database. Please check configuration.',
      variant: 'destructive',
      action: {
        altText: "Reconnect",
        onClick: () => window.location.href = '/initialize'
      }
    });
    
    // Return null instead of potentially invalid instance
    return null;
  }
}

/**
 * Test a Supabase connection with the given URL and key
 * Enhanced with better error handling
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    if (!url || !anonKey) {
      logger.warn('Invalid connection parameters for test', {
        module: 'supabase-connection',
        hasUrl: !!url,
        hasKey: !!anonKey
      });
      return false;
    }
    
    logger.info('Testing Supabase connection', {
      module: 'supabase-connection',
      url: url.split('//')[1]
    });
    
    const testClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Try to make a simple query to test the connection
    const { error } = await testClient
      .from('profiles')
      .select('id')
      .limit(1);
    
    // Connection is good if there's no error or if it's just a "table not found" error
    const isConnected = !error || error.code === '42P01';
    
    if (isConnected) {
      logger.info('Supabase connection test successful', {
        module: 'supabase-connection',
        url: url.split('//')[1]
      });
    } else {
      logger.warn('Supabase connection test failed', {
        module: 'supabase-connection',
        url: url.split('//')[1],
        errorCode: error.code,
        errorMessage: error.message
      });
    }
    
    return isConnected;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error testing Supabase connection', error, {
      module: 'supabase-connection'
    });
    
    // Check for specific error types
    if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
      logger.warn('Network error during connection test - possible offline or CORS issue', {
        module: 'supabase-connection'
      });
    }
    
    return false;
  }
}

/**
 * Reset the Supabase client instance
 * This is useful when the configuration changes
 */
export function resetSupabaseClient() {
  logger.info('Resetting Supabase client instance', {
    module: 'supabase-connection'
  });
  
  supabaseInstance = null;
}

/**
 * Get current connection information for debugging
 * Enhanced with more detailed information
 */
export function getConnectionInfo() {
  const connIdKey = getConnectionKey(CONNECTION_ID_KEY);
  const envKey = getConnectionKey(ENVIRONMENT_KEY);
  const lastConnKey = getConnectionKey(LAST_CONNECTION_TIME_KEY);
  
  const connectionId = localStorage.getItem(connIdKey) || 'not_set';
  const environmentJson = localStorage.getItem(envKey);
  let environment = null;
  
  try {
    environment = environmentJson ? JSON.parse(environmentJson) : null;
  } catch (e) {
    environment = { id: window.location.hostname };
  }
  
  const lastConnection = localStorage.getItem(lastConnKey) || 'never';
  const storedConfig = getStoredConfig();
  const connectionState = getConnectionState();
  
  return {
    connectionId,
    environment: environment || getEnvironmentInfo(),
    lastConnection,
    connectionState,
    hasStoredConfig: !!storedConfig,
    url: storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config',
    configTimestamp: storedConfig?.savedAt || 'unknown'
  };
}

/**
 * Update connection state
 * This tracks connection attempts and success/failure
 */
function updateConnectionState(state: Partial<ConnectionState>) {
  try {
    const currentState = getConnectionState();
    const newState = {
      ...currentState,
      ...state
    };
    
    localStorage.setItem(
      getConnectionKey(CONNECTION_STATE_KEY),
      JSON.stringify(newState)
    );
    
    return true;
  } catch (e) {
    logger.error('Error updating connection state', e, {
      module: 'supabase-connection'
    });
    return false;
  }
}

/**
 * Get current connection state
 */
function getConnectionState(): ConnectionState {
  try {
    const stateJson = localStorage.getItem(getConnectionKey(CONNECTION_STATE_KEY));
    
    if (!stateJson) {
      return {
        lastAttempt: '',
        lastSuccess: null,
        attemptCount: 0,
        source: ''
      };
    }
    
    return JSON.parse(stateJson);
  } catch (e) {
    logger.error('Error reading connection state', e, {
      module: 'supabase-connection'
    });
    
    return {
      lastAttempt: '',
      lastSuccess: null,
      attemptCount: 0,
      source: '',
      error: 'Error reading state'
    };
  }
}

/**
 * Check if the connection is healthy
 * This can be used to detect stale connections
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    if (!supabaseInstance) {
      return false;
    }
    
    // Try a simple query to check connection
    const { error } = await supabaseInstance
      .from('profiles')
      .select('id')
      .limit(1);
    
    // Connection is healthy if there's no error or if it's just a "table not found" error
    return !error || error.code === '42P01';
  } catch (error) {
    logger.error('Error checking connection health', error, {
      module: 'supabase-connection'
    });
    return false;
  }
}
/**
 * Attempt to repair a broken connection
 * This implements self-healing for common connection issues
 */
export async function attemptConnectionRepair(): Promise<boolean> {
  try {
    logger.info('Attempting to repair connection', {
      module: 'supabase-connection'
    });
    
    // Get current connection state
    const connectionInfo = getConnectionInfo();
    
    // Check if we have a stored config but connection is failing
    if (connectionInfo.hasStoredConfig) {
      // Try to refresh the client
      resetSupabaseClient();
      
      // Check if that fixed it
      if (await checkConnectionHealth()) {
        logger.info('Connection repaired by resetting client', {
          module: 'supabase-connection'
        });
        return true;
      }
      
      // Try to reload configuration
      const result = await configLoader.loadConfiguration();
      if (result.config) {
        configLoader.saveConfiguration(result.config);
        resetSupabaseClient();
        
        // Check if that fixed it
        if (await checkConnectionHealth()) {
          logger.info('Connection repaired by reloading configuration', {
            module: 'supabase-connection'
          });
          return true;
        }
      }
    }
    
    logger.warn('Unable to repair connection', {
      module: 'supabase-connection'
    });
    
    return false;
  } catch (error) {
    logger.error('Error during connection repair attempt', error, {
      module: 'supabase-connection'
    });
    return false;
  }
}
