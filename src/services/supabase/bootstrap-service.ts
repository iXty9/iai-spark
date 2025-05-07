
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
): Promise<ConnectionConfig | null> {
  try {
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
      return null;
    }
    
    if (!data || data.length === 0) {
      logger.info('No connection settings found in database during bootstrap', { module: 'bootstrap' });
      return null;
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
    return null;
  }
}

/**
 * Test if we have connection to Supabase with the provided credentials
 * No dependencies on other services
 */
export async function testBootstrapConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    const testClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Try to make a simple query to test the connection
    const { error } = await testClient
      .from('app_settings')
      .select('key')
      .limit(1);
    
    // Connection is good if there's no error or if it's just a "table not found" error
    const isConnected = !error || error.code === '42P01';
    
    if (isConnected) {
      logger.info('Bootstrap connection test successful', { 
        module: 'bootstrap',
        url: url.split('//')[1]
      });
    } else {
      logger.warn('Bootstrap connection test failed', { 
        module: 'bootstrap',
        url: url.split('//')[1],
        errorCode: error.code
      });
    }
    
    return isConnected;
  } catch (error) {
    logger.error('Error testing bootstrap connection', error, { module: 'bootstrap' });
    return false;
  }
}

/**
 * Parse URL parameters for bootstrap configuration
 * This is useful for sharing connection settings via URL
 */
export function parseUrlBootstrapParams(): { url?: string, anonKey?: string } {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('public_url');
    const anonKey = urlParams.get('public_key');
    
    if (url && anonKey) {
      logger.info('Found bootstrap configuration in URL parameters', {
        module: 'bootstrap',
        url: url.split('//')[1]
      });
      return { url, anonKey };
    }
    
    return {};
  } catch (error) {
    logger.error('Error parsing URL bootstrap parameters', error, { module: 'bootstrap' });
    return {};
  }
}

/**
 * Attempt to bootstrap connection from URL parameters
 */
export async function bootstrapFromUrlParameters(): Promise<boolean> {
  try {
    const { url, anonKey } = parseUrlBootstrapParams();
    
    if (!url || !anonKey) {
      return false;
    }
    
    // Test the connection before proceeding
    const isConnected = await testBootstrapConnection(url, anonKey);
    
    if (!isConnected) {
      logger.warn('Failed to connect using URL parameters', { module: 'bootstrap' });
      return false;
    }
    
    // Try to fetch the full configuration from the database
    const config = await fetchBootstrapConfig(url, anonKey);
    
    if (config) {
      logger.info('Successfully bootstrapped from URL parameters', {
        module: 'bootstrap',
        url: url.split('//')[1]
      });
      return true;
    } else {
      // Even if we couldn't get the full config, we still have a valid connection
      logger.info('Minimal connection bootstrapped from URL parameters', {
        module: 'bootstrap',
        url: url.split('//')[1]
      });
      return true;
    }
  } catch (error) {
    logger.error('Error bootstrapping from URL parameters', error, { module: 'bootstrap' });
    return false;
  }
}
