import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoredConfig, saveConfig, clearConfig } from '@/config/supabase-config';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';

// Store the Supabase client instance
let supabaseInstance: SupabaseClient | null = null;

// Constants for connection tracking
const CONNECTION_ID_KEY = 'connection_id';
const ENVIRONMENT_KEY = 'environment_info';
const LAST_CONNECTION_TIME_KEY = 'last_connection_time';
const CONNECTION_STATE_KEY = 'connection_state';
const INITIALIZATION_LOCK_KEY = 'initialization_lock';
const INITIALIZATION_TIMESTAMP_KEY = 'initialization_timestamp';

// Connection state interface
interface ConnectionState {
  lastAttempt: string;
  lastSuccess: string | null;
  attemptCount: number;
  source: string;
  error?: string;
}

// Environment info interface
interface EnvironmentInfo {
  id: string;
  host: string;
  timestamp: string;
  userAgent?: string;
}

// Type definition for Database (placeholder - should match your actual database type)
type Database = any;

// Config loader utility
const configLoader = {
  loadConfiguration: async () => {
    try {
      const staticConfig = await fetchStaticSiteConfig();
      
      // Check if we have a valid static config
      if (staticConfig && staticConfig.supabaseUrl && staticConfig.supabaseAnonKey) {
        // Return properly formatted config object
        return { 
          config: {
            url: staticConfig.supabaseUrl,
            anonKey: staticConfig.supabaseAnonKey,
            isInitialized: true,
            savedAt: staticConfig.lastUpdated || new Date().toISOString(),
            environment: getEnvironmentId()
          },
          source: 'STATIC_FILE'  // Indicate this came from site-config.json
        };
      }
      
      return { config: null };
    } catch (e) {
      logger.error('Error loading static configuration', e, {
        module: 'config-loader'
      });
      return { config: null };
    }
  },
  saveConfiguration: (config: any) => {
    saveConfig(config);
  }
};

/**
 * Get environment ID for tracking
 */
function getEnvironmentId(): string {
  return window.location.hostname;
}

/**
 * Get environment information
 */
function getEnvironmentInfo(): EnvironmentInfo {
  return {
    id: getEnvironmentId(),
    host: window.location.hostname,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
}

/**
 * Get connection storage key with namespace
 */
function getConnectionKey(key: string): string {
  return `supabase_${key}`;
}

// Connection test result type
export interface ConnectionTestResult {
  isConnected: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Test a Supabase connection with given credentials
 * Returns a result object or boolean depending on the implementation
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<ConnectionTestResult | boolean> {
  try {
    // Input validation - return early if values are empty
    if (!url || !url.trim() || !anonKey || !anonKey.trim()) {
      logger.warn('Empty credentials provided to testSupabaseConnection', {
        module: 'connection-service',
        hasUrl: !!url,
        hasAnonKey: !!anonKey
      });
      
      return {
        isConnected: false,
        error: 'Empty credentials provided',
        errorCode: 'EMPTY_CREDENTIALS'
      };
    }
    
    logger.info('Testing Supabase connection', {
      module: 'connection-service',
      urlPreview: url.substring(0, 12) + '...'
    });
    
    // Create a temporary client for testing
    const tempClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Verify the connection works by making a simple query
    const { data, error } = await tempClient.from('app_settings').select('count(*)', { count: 'exact' });
    
    if (error) {
      logger.error('Connection test failed', {
        module: 'connection-service',
        error: error.message,
        code: error.code
      });
      
      return {
        isConnected: false,
        error: error.message,
        errorCode: error.code
      };
    }
    
    // Also check auth is working
    const { data: authData, error: authError } = await tempClient.auth.getSession();
    
    if (authError) {
      logger.error('Connection auth test failed', {
        module: 'connection-service',
        error: authError.message
      });
      
      return {
        isConnected: false,
        error: `Auth check failed: ${authError.message}`,
        errorCode: 'AUTH_ERROR'
      };
    }
    
    logger.info('Supabase connection test successful', {
      module: 'connection-service'
    });
    
    return {
      isConnected: true
    };
  } catch (error) {
    logger.error('Error testing Supabase connection', error instanceof Error ? error : String(error), {
      module: 'connection-service'
    });
    
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Acquire initialization lock to prevent race conditions
 * Returns true if lock was acquired, false otherwise
 */
function acquireInitializationLock(): boolean {
  try {
    const lockKey = getConnectionKey(INITIALIZATION_LOCK_KEY);
    const timestampKey = getConnectionKey(INITIALIZATION_TIMESTAMP_KEY);
    
    // Check if there's an existing lock
    const existingLock = localStorage.getItem(lockKey);
    const existingTimestamp = localStorage.getItem(timestampKey);
    
    // If there's an existing lock, check if it's stale (older than 10 seconds)
    if (existingLock && existingTimestamp) {
      const lockTime = new Date(existingTimestamp).getTime();
      const currentTime = new Date().getTime();
      
      // If lock is less than 10 seconds old, it's still valid
      if (currentTime - lockTime < 10000) {
        return false;
      }
    }
    
    // Set the lock and timestamp
    const lockId = `lock_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(lockKey, lockId);
    localStorage.setItem(timestampKey, new Date().toISOString());
    
    return true;
  } catch (e) {
    // If there's an error, assume we couldn't acquire the lock
    return false;
  }
}

/**
 * Release initialization lock
 */
function releaseInitializationLock(): void {
  try {
    const lockKey = getConnectionKey(INITIALIZATION_LOCK_KEY);
    localStorage.removeItem(lockKey);
  } catch (e) {
    // Silently handle errors
  }
}

// Global variable to track if we're currently initializing the client
let isInitializingClient = false;

/**
 * Get the Supabase client instance, creating it if needed
 * Now with improved error handling and state management
 */
export async function getSupabaseClient() {
  // Return existing instance if available
  if (supabaseInstance) return supabaseInstance;
  
  // Check if we already have an instance in the window object
  if (typeof window !== 'undefined' && (window as any).supabaseInstance) {
    supabaseInstance = (window as any).supabaseInstance;
    
    // Verify the instance has a working from method
    if (supabaseInstance && typeof supabaseInstance.from === 'function') {
      try {
        const testQuery = supabaseInstance.from('test_table');
        if (testQuery && typeof testQuery.select === 'function') {
          return supabaseInstance;
        }
      } catch (e) {
        // If there's an error, the instance is invalid
        supabaseInstance = null;
        (window as any).supabaseInstance = null;
      }
    } else {
      // If from is not a function, the instance is invalid
      supabaseInstance = null;
      (window as any).supabaseInstance = null;
    }
  }
  
  // If we're already initializing, wait a bit and check again
  if (isInitializingClient) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (supabaseInstance) return supabaseInstance;
    if (typeof window !== 'undefined' && (window as any).supabaseInstance) {
      supabaseInstance = (window as any).supabaseInstance;
      return supabaseInstance;
    }
  }
  
  // Set initializing flag
  isInitializingClient = true;
  
  // Try to acquire initialization lock
  const lockAcquired = acquireInitializationLock();
  
  try {
    
    // Check for special URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    const resetConfig = urlParams.get('reset_config') === 'true';
    
    if (resetConfig) {
      clearConfig();
      logger.info('Configuration reset requested via URL parameter', {
        module: 'supabase-connection'
      });
      releaseInitializationLock();
      return null;
    }
    
    if (forceInit) {
      logger.info('Force init parameter detected, not initializing Supabase client', {
        module: 'supabase-connection'
      });
      releaseInitializationLock();
      return null;
    }
    
    // Try to load from site-config.json first
    try {
      const staticConfig = await fetchStaticSiteConfig();
      if (staticConfig && staticConfig.supabaseUrl && staticConfig.supabaseAnonKey) {
        // Convert to the format expected by the Supabase client
        const supabaseConfig = {
          url: staticConfig.supabaseUrl,
          anonKey: staticConfig.supabaseAnonKey,
          isInitialized: true,
          savedAt: staticConfig.lastUpdated || new Date().toISOString(),
          environment: getEnvironmentId()
        };
        
        // Save the config
        saveConfig(supabaseConfig);
      }
    } catch (e) {
      // Silently handle fetch errors
    }
    
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
    
    // Check for URL parameters for direct connection details
    const urlSupabaseUrl = urlParams.get('supabase_url');
    const urlSupabaseKey = urlParams.get('supabase_key');
    
    // If URL parameters are present, use them directly
    if (urlSupabaseUrl && urlSupabaseKey) {
      logger.info(`Using URL parameters for Supabase connection ${connectionId}`, {
        module: 'supabase-connection',
        url: urlSupabaseUrl.split('//')[1]
      });
      
      // Create and initialize the Supabase client with URL parameters
      supabaseInstance = createClient<Database>(urlSupabaseUrl, urlSupabaseKey, {
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
    
    // Get stored configuration
    const storedConfig = getStoredConfig();
    
    if (storedConfig && storedConfig.url && storedConfig.anonKey) {
      // Use stored configuration - minimal logging
      logger.info(`Using stored Supabase configuration`, {
        module: 'supabase-connection'
      });
      
      // Create and initialize the Supabase client with stored config
      supabaseInstance = createClient<Database>(storedConfig.url, storedConfig.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          debug: false // Disable debug to prevent console spam
        }
      });
      
      // Store in window for cross-reference
      if (typeof window !== 'undefined') {
        (window as any).supabaseInstance = supabaseInstance;
      }
      
      // Record last connection time
      localStorage.setItem(getConnectionKey(LAST_CONNECTION_TIME_KEY), new Date().toISOString());
      
      // Update connection state
      updateConnectionState({
        lastAttempt: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        attemptCount: 1,
        source: 'stored_config'
      });
      
      // Listen for auth state changes to check permissions
      supabaseInstance.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Check permissions when user signs in or token is refreshed
          checkAndFixUserPermissions().catch(err => {
            logger.error('Error checking permissions after auth change', err, {
              module: 'supabase-connection'
            });
          });
        }
      });
      
      // Check health and start monitoring - with reduced logging
      setTimeout(async () => {
        try {
          if (!await checkConnectionHealth()) {
            await attemptConnectionRepair();
          }
          
          // Start connection monitoring
          startConnectionMonitoring();
          
          // Check and fix user permissions
          // This helps prevent RLS policy violations
          await checkAndFixUserPermissions();
        } catch (e) {
          // Silent error handling
        }
      }, 1000);
      
      return supabaseInstance;
    }
    
    // If no stored config is available, try to load from site-config.json first
    // then trigger bootstrap in the background if that fails
    if (lockAcquired) {
      // Try to load from site-config.json first
      try {
        const staticConfig = await fetchStaticSiteConfig();
        
        if (staticConfig && staticConfig.supabaseUrl && staticConfig.supabaseAnonKey) {
          // Convert to the format expected by the Supabase client
          const supabaseConfig = {
            url: staticConfig.supabaseUrl,
            anonKey: staticConfig.supabaseAnonKey,
            isInitialized: true,
            savedAt: staticConfig.lastUpdated || new Date().toISOString(),
            environment: getEnvironmentId()
          };
          
          // Save the config
          saveConfig(supabaseConfig);
          resetSupabaseClient();
          
          // Create a new client with the config
          supabaseInstance = createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
            auth: {
              storage: localStorage,
              persistSession: true,
              autoRefreshToken: true,
              debug: false
            }
          });
          
          // Store in window for cross-reference
          (window as any).supabaseInstance = supabaseInstance;
          
          return supabaseInstance;
        }
        
        // If that fails, try bootstrap
        await checkPublicBootstrapConfig();
      } catch (error) {
        // Silent error handling to avoid console spam
      }
    }
    
    // No valid configuration available - minimal logging
    logger.warn('No valid Supabase configuration available', { 
      module: 'supabase-connection'
    });
    
    // Release the lock since initialization failed
    if (lockAcquired) {
      releaseInitializationLock();
    }
    
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
    
    // Release the lock since initialization failed
    if (lockAcquired) {
      releaseInitializationLock();
    }
    
    // Return null instead of potentially invalid instance
    return null;
  } finally {
    // Always reset the initializing flag
    isInitializingClient = false;
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
  
  // Also clear from window object
  if (typeof window !== 'undefined') {
    (window as any).supabaseInstance = null;
  }
  
  // Release any existing initialization lock
  releaseInitializationLock();
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
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      // Try a simple query to check connection
      const { error } = await supabaseInstance
        .from('profiles')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      // Connection is healthy if there's no error or if it's just a "table not found" error
      return !error || error.code === '42P01';
    } catch (innerError) {
      clearTimeout(timeoutId);
      
      // Check for timeout
      if (innerError.name === 'AbortError') {
        return false;
      }
      
      throw innerError;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Check and fix row-level security policies for the current user
 * This helps resolve permission issues with profile updates
 */
export async function checkAndFixUserPermissions(): Promise<boolean> {
  try {
    if (!supabaseInstance) {
      return false;
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseInstance.auth.getUser();
    
    if (userError || !user) {
      return false;
    }
    
    // Check if user has a profile entry
    const { data: profile, error: profileError } = await supabaseInstance
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    // If profile doesn't exist or there's an error, try to create it
    if (profileError || !profile) {
      // Insert profile with minimal data
      const { error: insertError } = await supabaseInstance
        .from('profiles')
        .insert({
          id: user.id,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Start monitoring the connection health
 * Returns a function to stop monitoring
 */
export function startConnectionMonitoring(intervalMs = 60000): () => void {
  let monitoringInterval: number | null = null;
  
  const checkConnection = async () => {
    try {
      const isHealthy = await checkConnectionHealth();
      
      // Update connection state
      updateConnectionState({
        lastAttempt: new Date().toISOString(),
        lastSuccess: isHealthy ? new Date().toISOString() : getConnectionState().lastSuccess,
        attemptCount: getConnectionState().attemptCount + 1,
        source: getConnectionState().source,
        error: isHealthy ? undefined : 'Connection health check failed'
      });
      
      // If not healthy, attempt repair
      if (!isHealthy) {
        const repaired = await attemptConnectionRepair();
        
        if (repaired) {
          // Update state after successful repair
          updateConnectionState({
            lastSuccess: new Date().toISOString(),
            error: undefined
          });
        }
      }
    } catch (e) {
      // Silent error handling
    }
  };
  
  // Start monitoring
  if (typeof window !== 'undefined') {
    monitoringInterval = window.setInterval(checkConnection, intervalMs);
    
    // Initial check
    checkConnection();
  }
  
  // Return function to stop monitoring
  return () => {
    if (monitoringInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(monitoringInterval);
    }
  };
}

/**
 * Attempt to repair a broken connection
 * This implements self-healing for common connection issues
 */
export async function attemptConnectionRepair(): Promise<boolean> {
  try {
    // Get current connection state
    const connectionInfo = getConnectionInfo();
    
    // Check if we have a stored config but connection is failing
    if (connectionInfo.hasStoredConfig) {
      // Try to refresh the client
      resetSupabaseClient();
      
      // Check if that fixed it
      if (await checkConnectionHealth()) {
        return true;
      }
      
      // Try to repair malformed URL if present
      const storedConfig = getStoredConfig();
      if (storedConfig?.url) {
        // Import the URL repair function
        const { attemptUrlFormatRepair } = await import('@/services/supabase/config-validation');
        
        const repairedUrl = attemptUrlFormatRepair(storedConfig.url);
        if (repairedUrl && repairedUrl !== storedConfig.url) {
          // Test connection with repaired URL
          const connectionTest = await testSupabaseConnection(repairedUrl, storedConfig.anonKey);
          
          // Check if the connection test was successful
          const isConnected = typeof connectionTest === 'boolean' 
            ? connectionTest 
            : connectionTest.isConnected;
            
          if (isConnected) {
            // Save the repaired configuration
            configLoader.saveConfiguration({
              ...storedConfig,
              url: repairedUrl
            });
            resetSupabaseClient();
            
            // Update site-config.json with repaired URL
            try {
              const { createSiteConfig, updateStaticSiteConfig } = await import('@/services/site-config/site-config-file-service');
              
              const siteConfig = createSiteConfig(repairedUrl, storedConfig.anonKey);
              await updateStaticSiteConfig(siteConfig);
            } catch (e) {
              // Silent error handling
            }
            
            return true;
          }
        }
      }
      
      // Try to reload configuration
      const result = await configLoader.loadConfiguration();
      if (result.config) {
        configLoader.saveConfiguration(result.config);
        resetSupabaseClient();
        
        // Check if that fixed it
        if (await checkConnectionHealth()) {
          return true;
        }
      }
      
      // Try with service key if available
      const configWithServiceKey = getStoredConfig();
      if (configWithServiceKey?.serviceKey) {
        // Create temporary client with service key
        const tempClient = createClient(configWithServiceKey.url, configWithServiceKey.serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        
        // Try to verify and update configuration
        try {
          const { data, error } = await tempClient
            .from('app_settings')
            .select('key, value')
            .in('key', ['supabase_url', 'supabase_anon_key']);
            
          if (!error && data && data.length > 0) {
            // Extract updated configuration
            const updatedConfig = {
              url: data.find(item => item.key === 'supabase_url')?.value || configWithServiceKey.url,
              anonKey: data.find(item => item.key === 'supabase_anon_key')?.value || configWithServiceKey.anonKey,
              serviceKey: configWithServiceKey.serviceKey,
              isInitialized: true,
              savedAt: new Date().toISOString(),
              environment: configWithServiceKey.environment
            };
            
            // Save updated configuration
            configLoader.saveConfiguration(updatedConfig);
            resetSupabaseClient();
            
            // Check if that fixed it
            if (await checkConnectionHealth()) {
              return true;
            }
          }
        } catch (e) {
          // Silent error handling
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if the current configuration is invalid or empty
 * This helps detect when we should redirect to initialization
 */
export function isConfigEmpty(): boolean {
  try {
    const config = getStoredConfig();
    
    // Check if we have no config at all
    if (!config) {
      return true;
    }
    
    // Check if the config has empty values
    if (!config.url || !config.url.trim() || !config.anonKey || !config.anonKey.trim()) {
      // Clear the invalid config to prevent auto-connection attempts
      clearConfig();
      return true;
    }
    
    return false;
  } catch (e) {
    // If there's any error reading the config, assume it's empty
    // This helps prevent redirect loops in some browsers
    return true;
  }
}

/**
 * Check if the current route should bypass the normal redirect behavior
 * This prevents redirect loops for specific pages like /initialize and /supabase-auth
 */
export function shouldBypassRedirect(pathname: string): boolean {
  // These routes should never be redirected away from
  const bypassRoutes = [
    '/initialize',
    '/auth/error',
    '/api/',
    '/debug'
  ];
  
  return bypassRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check for public bootstrap configuration
 * Attempts to load configuration from public sources
 */
export async function checkPublicBootstrapConfig(): Promise<boolean> {
  try {
    // Check if we already have config first
    const config = getStoredConfig();
    if (config && config.url && config.anonKey) {
      return true;
    }
    
    // Try to fetch public config
    try {
      const publicConfig = await fetchStaticSiteConfig();
      
      if (publicConfig && 
          publicConfig.supabaseUrl && 
          publicConfig.supabaseAnonKey) {
        
        // Convert to the format expected by the Supabase client
        const supabaseConfig = {
          url: publicConfig.supabaseUrl,
          anonKey: publicConfig.supabaseAnonKey,
          isInitialized: true,
          savedAt: publicConfig.lastUpdated || new Date().toISOString(),
          environment: getEnvironmentId()
        };
        
        // Save the config
        saveConfig(supabaseConfig);
        
        return true;
      }
    } catch (e) {
      // Silently handle fetch errors
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize client with fallback to prevent auth errors
 * This creates a minimal client that won't throw errors when accessed
 */
function initializeClientWithFallback() {
  try {
    // Create a dummy client that won't throw errors
    const dummyUrl = 'https://example.supabase.co';
    const dummyKey = 'dummy-key';
    
    // Create a client with settings that prevent auto-connection
    const dummyClient = createClient(dummyUrl, dummyKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    // Ensure the auth object is properly initialized
    if (!dummyClient.auth) {
      throw new Error('Auth object not initialized in fallback client');
    }
    
    // Add a safe getSession method if it doesn't exist
    if (typeof dummyClient.auth.getSession !== 'function') {
      dummyClient.auth.getSession = async () => {
        return { data: { session: null }, error: null };
      };
    }
    
    // Add a safe from method if it doesn't exist
    if (typeof dummyClient.from !== 'function') {
      dummyClient.from = function(table) {
        return {
          select: () => Promise.resolve({ data: null, error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
          eq: function() {
            return {
              select: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null })
            };
          },
          single: () => Promise.resolve({ data: null, error: null })
        };
      };
    }
    
    return dummyClient;
  } catch (error) {
    // Return a minimal object with the required methods to prevent null errors
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: null, error: null, unsubscribe: () => {} })
      },
      from: function(table) {
        return {
          select: () => Promise.resolve({ data: null, error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
          eq: () => ({ 
            select: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null })
          }),
          single: () => Promise.resolve({ data: null, error: null })
        };
      }
    };
  }
}

/**
 * Get the appropriate redirect path based on the current config state
 * Returns null if no redirect is needed
 */
// Track if we're currently checking for redirect to prevent multiple redirects
let isCheckingRedirect = false;

export async function getRedirectPath(): Promise<string | null> {
  // Prevent multiple simultaneous redirect checks
  if (isCheckingRedirect) {
    return null;
  }
  
  isCheckingRedirect = true;
  
  try {
    // Check if we're on a bypass route
    const pathname = window.location.pathname;
    if (shouldBypassRedirect(pathname)) {
      isCheckingRedirect = false;
      return null;
    }
    
    // Check if we already have a valid stored config first (fastest check)
    try {
      const storedConfig = getStoredConfig();
      if (storedConfig && storedConfig.url && storedConfig.anonKey) {
        // We already have a valid config, no redirect needed
        isCheckingRedirect = false;
        return null;
      }
    } catch (e) {
      // If there's an error reading the stored config, continue to next check
    }
    
    // Then try to load from site-config.json
    try {
      const staticConfig = await fetchStaticSiteConfig();
      
      // If static config exists and is valid, use it to initialize the app
      if (staticConfig && staticConfig.supabaseUrl && staticConfig.supabaseUrl.trim() && 
          staticConfig.supabaseAnonKey && staticConfig.supabaseAnonKey.trim()) {
        
        // Convert to the format expected by the Supabase client
        const supabaseConfig = {
          url: staticConfig.supabaseUrl,
          anonKey: staticConfig.supabaseAnonKey,
          isInitialized: true,
          savedAt: staticConfig.lastUpdated || new Date().toISOString(),
          environment: getEnvironmentId()
        };
        
        // Save the config
        saveConfig(supabaseConfig);
        
        // No redirect needed, we've loaded the config
        isCheckingRedirect = false;
        return null;
      }
    } catch (e) {
      // If we can't load the static config, continue
    }
    
    // If we get here, we don't have a valid config from any source
    isCheckingRedirect = false;
    return '/initialize';
  } catch (error) {
    isCheckingRedirect = false;
    return null;
  }
}
