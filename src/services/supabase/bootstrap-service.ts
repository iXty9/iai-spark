
/**
 * Bootstrap service for initial Supabase connection
 * This service is specifically designed to avoid circular dependencies.
 * It provides minimal functionality to retrieve connection settings
 * without relying on the main Supabase client.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

// Simple types for bootstrap operations
interface ConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  isInitialized?: boolean;
  lastConnection?: string;
}

/**
 * Fetch connection configuration from app_settings
 * This uses a direct minimal client to avoid circular dependencies
 */
export async function fetchBootstrapConfig(
  url: string,
  anonKey: string
): Promise<ConnectionConfig | { error: string; code: string; }> {
  try {
    if (!url || !anonKey) {
      return {
        error: 'Missing URL or API key',
        code: 'missing_credentials'
      };
    }
    
    // Create a minimal client just for this operation
    const bootstrapClient = createClient(url, anonKey, {
      auth: {
        persistSession: false, // Don't persist this temporary client
        autoRefreshToken: false,
      }
    });
    
    logger.info('Bootstrapping connection using temporary client', { 
      module: 'bootstrap',
      url: url.split('//')[1] // Log domain only for security
    });
    
    // Try to fetch connection settings from app_settings table
    const { data, error } = await bootstrapClient
      .from('app_settings')
      .select('key, value')
      .in('key', ['supabase_url', 'supabase_anon_key', 'supabase_service_key', 
                 'supabase_initialized', 'supabase_last_connection']);
    
    if (error) {
      logger.error('Bootstrap config fetch failed', error, { module: 'bootstrap' });
      return {
        error: error.message,
        code: error.code || 'query_error'
      };
    }
    
    if (!data || data.length === 0) {
      logger.info('No connection settings found in database during bootstrap', { module: 'bootstrap' });
      return {
        error: 'No configuration found in database',
        code: 'no_config_found'
      };
    }
    
    // Convert array of key-value pairs to a configuration object
    const config: Record<string, string> = {};
    data.forEach(item => {
      config[item.key] = item.value;
    });
    
    // Ensure we have the minimum required settings
    if (!config.supabase_url || !config.supabase_anon_key) {
      logger.warn('Incomplete connection settings found during bootstrap', { module: 'bootstrap' });
      return null;
    }
    
    logger.info('Successfully retrieved bootstrap config from database', { 
      module: 'bootstrap',
      url: config.supabase_url.split('//')[1] // Log domain only for security
    });
    
    return {
      url: config.supabase_url,
      anonKey: config.supabase_anon_key,
      serviceKey: config.supabase_service_key,
      isInitialized: config.supabase_initialized === 'true',
      lastConnection: config.supabase_last_connection
    };
  } catch (error) {
    logger.error('Error retrieving bootstrap config', error, { module: 'bootstrap' });
    
    // Categorize errors for better handling
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        error: 'Network error connecting to Supabase',
        code: 'network_error'
      };
    }
    
    return {
      error: error instanceof Error ? error.message : String(error),
      code: 'unexpected_error'
    };
  }
}

/**
 * Test if we have connection to Supabase with the provided credentials
 * Enhanced with permission testing and detailed error reporting
 */
export async function testBootstrapConnection(
  url: string, 
  anonKey: string
): Promise<{
  isConnected: boolean;
  hasPermissions: boolean;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!url || !anonKey) {
      return {
        isConnected: false,
        hasPermissions: false,
        error: 'Missing URL or API key',
        errorCode: 'missing_credentials'
      };
    }
    
    const testClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Try to make a simple query to test the connection
    const { error: connectionError } = await testClient
      .from('app_settings')
      .select('key')
      .limit(1);
    
    // Connection is good if there's no error or if it's just a "table not found" error
    const isConnected = !connectionError || connectionError.code === '42P01';
    
    if (!isConnected) {
      logger.warn('Bootstrap connection test failed', { 
        module: 'bootstrap',
        url: url.split('//')[1],
        errorCode: connectionError?.code
      });
      
      return {
        isConnected: false,
        hasPermissions: false,
        error: connectionError?.message || 'Unknown connection error',
        errorCode: connectionError?.code
      };
    }
    
    logger.info('Bootstrap connection test successful', { 
      module: 'bootstrap',
      url: url.split('//')[1]
    });
    
    // Test permissions by trying to create a temporary table
    // This is a more thorough test than just reading
    try {
      const { error: permissionError } = await testClient.rpc('test_permissions', {});
      
      const hasPermissions = !permissionError;
      
      if (!hasPermissions) {
        logger.warn('Bootstrap permission test failed', {
          module: 'bootstrap',
          url: url.split('//')[1],
          errorCode: permissionError?.code
        });
        
        return {
          isConnected: true,
          hasPermissions: false,
          error: permissionError?.message || 'Permission test failed',
          errorCode: permissionError?.code
        };
      }
      
      logger.info('Bootstrap permission test successful', {
        module: 'bootstrap',
        url: url.split('//')[1]
      });
      
      return {
        isConnected: true,
        hasPermissions: true
      };
    } catch (permError) {
      // If the RPC doesn't exist yet, that's expected during initial setup
      // So we'll consider this a successful connection but note the permission issue
      logger.info('Permission test RPC not available, considering connection successful', {
        module: 'bootstrap',
        url: url.split('//')[1]
      });
      
      return {
        isConnected: true,
        hasPermissions: false,
        error: 'Permission test not available',
        errorCode: 'rpc_not_found'
      };
    }
  } catch (error) {
    logger.error('Error testing bootstrap connection', error, { module: 'bootstrap' });
    
    // Categorize network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        isConnected: false,
        hasPermissions: false,
        error: 'Network error connecting to Supabase',
        errorCode: 'network_error'
      };
    }
    
    return {
      isConnected: false,
      hasPermissions: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: 'unexpected_error'
    };
  }
}
