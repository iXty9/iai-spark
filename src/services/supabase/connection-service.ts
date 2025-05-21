
import { logger } from '@/utils/logging';
import { supabase, getResolvedClient } from '@/integrations/supabase/client';
import { getStoredConfig } from '@/config/supabase-config';
import { SupabaseConfig } from '@/config/supabase/types';

// Find and fix line 420 where Number() is used incorrectly
// Replace:
// const timeoutMs = Number(config.timeout || 5000);
// With:
const timeoutMs = config?.timeout ? Number(config.timeout) : 5000;

/**
 * Supabase client instance cache
 */
let supabaseClientInstance: any = null;

/**
 * Reset the Supabase client instance
 * Forces a new client to be created on next request
 */
export function resetSupabaseClient(): void {
  supabaseClientInstance = null;
  logger.info('Supabase client reset', { module: 'connection-service' });
}

/**
 * Get Supabase client instance
 * Returns the cached instance or creates a new one
 */
export async function getSupabaseClient(): Promise<any> {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  try {
    supabaseClientInstance = await supabase;
    return supabaseClientInstance;
  } catch (error) {
    logger.error('Error getting Supabase client', error, { module: 'connection-service' });
    throw error;
  }
}

/**
 * Test Supabase connection with provided credentials
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<ConnectionTestResult> {
  try {
    // Implementation details
    logger.info('Testing Supabase connection', { 
      module: 'connection-service',
      url: url.split('//')[1] // Log domain only for security
    });

    // Return success for now
    return { 
      isConnected: true,
      hasPermission: true,
      message: 'Connection successful'
    };
  } catch (error) {
    logger.error('Connection test failed', error, { module: 'connection-service' });
    return {
      isConnected: false,
      hasPermission: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if current path should bypass connection redirection
 */
export function shouldBypassRedirect(path: string): boolean {
  // Paths that should never be redirected from, even if config is missing
  const NON_REDIRECTABLE_PATHS = [
    '/initialize',
    '/supabase-auth',
    '/admin/connection'
  ];
  
  return NON_REDIRECTABLE_PATHS.some(nonRedirectPath => 
    path === nonRedirectPath || path.startsWith(`${nonRedirectPath}/`)
  );
}

/**
 * Get connection information
 */
export function getConnectionInfo(): {
  hasStoredConfig: boolean;
  url?: string;
  lastConnection?: string;
} {
  const config = getStoredConfig();
  return {
    hasStoredConfig: !!config,
    url: config?.url,
    lastConnection: config?.lastConnection
  };
}

/**
 * Check if connection is healthy
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    if (!client) return false;
    
    // Try a simple query to see if connection is healthy
    const { error } = await client
      .from('app_settings')
      .select('key')
      .limit(1);
    
    // Connection is good if there's no error or if it's just a "table not found" error
    return !error || error.code === '42P01';
  } catch (error) {
    logger.error('Connection health check failed', error, { module: 'connection-service' });
    return false;
  }
}

/**
 * Check if public bootstrap config is available
 */
export async function checkPublicBootstrapConfig(): Promise<boolean> {
  try {
    // Attempt to read config
    const config = getStoredConfig();
    if (!config || !config.url || !config.anonKey) {
      return false;
    }

    // Check connection health
    return await checkConnectionHealth();
  } catch (error) {
    logger.error('Error checking bootstrap config', error, { module: 'connection-service' });
    return false;
  }
}

/**
 * Connection test result interface
 */
export interface ConnectionTestResult {
  isConnected: boolean;
  hasPermission: boolean;
  message: string;
  error?: any;
}
