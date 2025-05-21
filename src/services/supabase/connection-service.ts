
import { getStoredConfig, saveConfig, clearConfig, getEnvironmentInfo } from '@/config/supabase-config';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

// Cache the client instance
let supabaseClient: any = null;

/**
 * Helper function to safely work with Supabase client
 */
export const withSupabase = async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Supabase client not available');
  return await fn(client);
};

/**
 * Create a new Supabase client using stored configuration
 */
export async function getSupabaseClient(): Promise<any> {
  // Return cached client if available
  if (supabaseClient) return supabaseClient;
  
  try {
    const config = getStoredConfig();
    if (!config || !config.url || !config.anonKey) {
      logger.warn('No valid Supabase configuration found', { module: 'connection-service' });
      return null;
    }

    // Ensure we're using valid string values
    const url = String(config.url);
    const anonKey = String(config.anonKey);

    // Create a new client with the configuration
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'supabase_auth_token',
      }
    });

    // Update connection info
    const connectionId = generateConnectionId();
    localStorage.setItem('supabase_connection_id', connectionId);
    localStorage.setItem('last_connection_time', new Date().toISOString());

    logger.info('Supabase client initialized', {
      url: url.split('//')[1], 
      connectionId,
      module: 'connection-service'
    });
    
    return supabaseClient;
  } catch (error) {
    logger.error('Error initializing Supabase client', error, { module: 'connection-service' });
    return null;
  }
}

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(): string {
  const envInfo = getEnvironmentInfo();
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const timestamp = Date.now().toString(36);
  return `${envInfo.id.substring(0, 3)}-${timestamp}-${randomPart}`;
}

/**
 * Reset the cached Supabase client - forces a new client on next getSupabaseClient call
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
  logger.info('Supabase client reset', { module: 'connection-service' });
}

/**
 * Retrieve information about the current Supabase connection
 */
export function getConnectionInfo() {
  const config = getStoredConfig();
  const hasStoredConfig = !!(config && config.url && config.anonKey);
  
  let url = '';
  if (hasStoredConfig && config?.url) {
    // Only show the domain part of the URL for security
    try {
      const urlObj = new URL(config.url);
      url = urlObj.hostname;
    } catch (e) {
      url = 'invalid-url';
    }
  }

  // Get the last connection timestamp or "never"
  let lastConnection = 'never';
  try {
    const storedTime = localStorage.getItem('last_connection_time');
    if (storedTime) {
      lastConnection = storedTime;
    }
  } catch (e) {
    logger.warn('Error getting last connection time', { module: 'connection-service' });
  }
  
  return {
    hasStoredConfig,
    url,
    lastConnection,
    environment: getEnvironmentInfo(),
  };
}

/**
 * Test connection to Supabase
 */
export interface ConnectionTestResult {
  isConnected: boolean;
  error?: string;
  details?: any;
}

export async function testSupabaseConnection(url: string, key: string): Promise<ConnectionTestResult> {
  try {
    const testClient = createClient(url, key);
    const { data, error } = await testClient.from('app_settings').select('*').limit(1);
    
    if (error) {
      return {
        isConnected: false,
        error: error.message,
        details: { code: error.code, hint: error.hint }
      };
    }
    
    return { isConnected: true, details: { tableExists: !!data } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { isConnected: false, error: errorMessage };
  }
}

/**
 * Check if current route should bypass redirect
 */
export function shouldBypassRedirect(path: string): boolean {
  // Use an explicit conversion to number instead of Number()
  const now = parseInt(new Date().getTime().toString(), 10);
  
  // List of paths that should bypass redirect
  const bypassPaths = [
    '/supabase-auth',
    '/setup',
    '/reset-connection',
    '/initialize'
  ];
  
  // Add debugging paths
  if (process.env.NODE_ENV === 'development') {
    bypassPaths.push('/debug');
    bypassPaths.push('/dev');
  }
  
  return bypassPaths.some(bp => path.startsWith(bp));
}
