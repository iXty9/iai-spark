
/**
 * Supabase client provider
 * Provides a centralized way to get the Supabase client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { eventBus, AppEvents } from '@/utils/event-bus';
import { logger } from '@/utils/logging';
import { isTabVisible } from '@/utils/visibility-tracker';
import { getStoredConfig } from '@/config/supabase/storage';
import { toast } from 'sonner';

// State for client singleton
let clientInstance: SupabaseClient | null = null;
let isInitializing = false;
let initializationPromise: Promise<SupabaseClient | null> | null = null;
let initializationStartTime = 0;
let retryCount = 0;

// Constants
const CLIENT_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const INITIALIZATION_LOCK_KEY = 'supabase_client_init_lock';
const INITIALIZATION_LOCK_TIMEOUT_MS = 10000;

/**
 * Try to acquire initialization lock
 */
function acquireLock(): boolean {
  try {
    const lockTime = localStorage.getItem(INITIALIZATION_LOCK_KEY);
    
    // Check if lock exists and is recent
    if (lockTime && (Date.now() - Number(lockTime)) < INITIALIZATION_LOCK_TIMEOUT_MS) {
      return false;
    }
    
    // Set lock
    localStorage.setItem(INITIALIZATION_LOCK_KEY, Date.now().toString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Release initialization lock
 */
function releaseLock(): void {
  try {
    localStorage.removeItem(INITIALIZATION_LOCK_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get the Supabase client
 * @param options Options for getting the client
 * @returns Promise that resolves to the Supabase client or null if not available
 */
export async function getSupabaseClient(options: {
  forceInitialize?: boolean;
  timeout?: number;
} = {}): Promise<SupabaseClient | null> {
  const {
    forceInitialize = false,
    timeout = CLIENT_TIMEOUT_MS
  } = options;
  
  // If we have a client and don't need to force initialize, return it
  if (clientInstance && !forceInitialize) {
    return clientInstance;
  }
  
  // Check if initialization is already in progress
  if (isInitializing) {
    // If too much time has passed, consider it failed
    if (Date.now() - initializationStartTime > timeout) {
      logger.warn('Client initialization timed out, forcing reset', {
        module: 'client-provider',
        elapsedMs: Date.now() - initializationStartTime
      });
      
      // Reset initialization state
      isInitializing = false;
      initializationPromise = null;
      releaseLock();
    } else if (initializationPromise) {
      // Return existing promise
      return initializationPromise;
    }
  }
  
  // Skip if tab is not visible and this isn't a forced initialization
  if (!isTabVisible() && !forceInitialize) {
    logger.debug('Skipping client initialization as tab is not visible', {
      module: 'client-provider'
    });
    return null;
  }
  
  // Try to acquire lock
  const lockAcquired = acquireLock();
  if (!lockAcquired && !forceInitialize) {
    logger.debug('Could not acquire client initialization lock', {
      module: 'client-provider'
    });
    return null;
  }
  
  // Set initialization state
  isInitializing = true;
  initializationStartTime = Date.now();
  
  // Create the initialization promise
  initializationPromise = new Promise<SupabaseClient | null>(async (resolve) => {
    try {
      // Set timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        logger.error('Client initialization timed out', {
          module: 'client-provider'
        });
        
        isInitializing = false;
        releaseLock();
        resolve(null);
      }, timeout);
      
      // Get configuration
      const config = getStoredConfig();
      
      // Check if we have a valid configuration
      if (!config || !config.url || !config.anonKey) {
        logger.warn('No valid configuration found for Supabase client', {
          module: 'client-provider'
        });
        
        clearTimeout(timeoutId);
        isInitializing = false;
        releaseLock();
        resolve(null);
        return;
      }
      
      // Create the client
      logger.info('Creating Supabase client', {
        module: 'client-provider',
        url: config.url.split('//')[1] // Log domain only for security
      });
      
      const client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: localStorage
        }
      });
      
      // Test the client
      try {
        // Simple auth check
        const { error } = await client.auth.getSession();
        if (error) {
          logger.warn('Auth session check failed', {
            module: 'client-provider',
            error: error.message
          });
        }
      } catch (error) {
        logger.error('Error testing Supabase client', error, {
          module: 'client-provider'
        });
        
        // If this is not the first try, increment retry count
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          
          clearTimeout(timeoutId);
          isInitializing = false;
          releaseLock();
          
          // Retry with exponential backoff
          const delay = 1000 * Math.pow(2, retryCount - 1);
          logger.info(`Retrying client initialization in ${delay}ms (attempt ${retryCount})`, {
            module: 'client-provider'
          });
          
          setTimeout(() => {
            // Reset initialization state for retry
            initializationPromise = null;
          }, delay);
          
          resolve(null);
          return;
        }
      }
      
      // Clear timeout and update state
      clearTimeout(timeoutId);
      clientInstance = client;
      isInitializing = false;
      retryCount = 0;
      
      // Publish event
      eventBus.publish(AppEvents.CLIENT_INITIALIZED, {
        timestamp: new Date().toISOString()
      });
      
      releaseLock();
      resolve(client);
    } catch (error) {
      // Handle any unexpected errors
      logger.error('Unexpected error during client initialization', error, {
        module: 'client-provider'
      });
      
      isInitializing = false;
      releaseLock();
      resolve(null);
    }
  });
  
  return initializationPromise;
}

/**
 * Reset the Supabase client
 * @returns Promise that resolves when client is reset
 */
export async function resetSupabaseClient(): Promise<void> {
  // Reset state
  clientInstance = null;
  isInitializing = false;
  initializationPromise = null;
  retryCount = 0;
  
  // Release lock
  releaseLock();
  
  logger.info('Supabase client reset', {
    module: 'client-provider'
  });
  
  // Publish event
  eventBus.publish(AppEvents.CLIENT_ERROR, {
    error: 'Client manually reset',
    timestamp: new Date().toISOString()
  });
}

/**
 * Get connection information
 */
export function getConnectionInfo() {
  const config = getStoredConfig();
  const environment = {
    id: window.location.hostname,
    host: window.location.host
  };
  
  return {
    url: config?.url ? `${config.url.split('//')[1].substring(0, 10)}...` : 'Not configured',
    environment,
    lastConnection: localStorage.getItem('supabase_last_connection') || 'never'
  };
}

/**
 * Check if Supabase client is ready
 * @returns True if client is initialized and ready to use
 */
export function isClientReady(): boolean {
  return !!clientInstance && !!(clientInstance as any)?.auth;
}

/**
 * Get the Supabase client synchronously
 * @returns The Supabase client or null if not initialized
 */
export function getSupabaseClientSync(): SupabaseClient | null {
  return clientInstance;
}

/**
 * Check if path should bypass redirect
 * @param path The path to check
 * @returns True if path should bypass redirect
 */
export function shouldBypassRedirect(path: string): boolean {
  // These routes should never be redirected away from, even if config is missing
  const NON_REDIRECTABLE_ROUTES = [
    '/supabase-auth',
    '/initialize',
    '/admin/connection'
  ];
  
  return NON_REDIRECTABLE_ROUTES.some(route => path.startsWith(route));
}

/**
 * Check connection health
 * @returns True if connection is healthy
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const client = await getSupabaseClient({ timeout: 3000 });
  if (!client) return false;
  
  try {
    const { error } = await client.from('app_settings').select('count(*)', { count: 'exact' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Check public bootstrap config
 * @returns True if config is valid
 */
export async function checkPublicBootstrapConfig(): Promise<boolean> {
  try {
    const client = await getSupabaseClient({ forceInitialize: true, timeout: 5000 });
    return !!client;
  } catch {
    return false;
  }
}

// Set up tab visibility handler
eventBus.subscribe(AppEvents.TAB_VISIBLE, async () => {
  // Check connection health when tab becomes visible
  if (isClientReady()) {
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      logger.warn('Connection unhealthy after tab visible, resetting client', {
        module: 'client-provider'
      });
      
      resetSupabaseClient();
    }
  }
});

// Clean up on app unmount
eventBus.subscribe(AppEvents.APP_UNMOUNTED, () => {
  clientInstance = null;
  isInitializing = false;
  initializationPromise = null;
  releaseLock();
});
