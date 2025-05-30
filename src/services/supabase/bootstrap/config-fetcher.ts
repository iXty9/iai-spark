
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import type { ConnectionConfig, BootstrapConfigResult } from './types';

/**
 * Fetch connection configuration from app_settings
 * This uses a direct minimal client to avoid circular dependencies
 */
export async function fetchBootstrapConfig(
  url: string,
  anonKey: string
): Promise<BootstrapConfigResult> {
  try {
    if (!url || !anonKey) {
      return {
        error: 'Missing URL or API key',
        code: 'missing_credentials'
      };
    }
    
    logger.info('Fetching bootstrap configuration', { 
      module: 'bootstrap-config',
      url: url.split('//')[1] // Log domain only for security
    });
    
    // Create a minimal client just for this operation
    const bootstrapClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Try to fetch connection settings from app_settings table
    const { data, error } = await bootstrapClient
      .from('app_settings')
      .select('key, value')
      .in('key', ['supabase_url', 'supabase_anon_key', 'supabase_service_key', 
                 'supabase_initialized', 'supabase_last_connection']);
    
    if (error) {
      logger.error('Bootstrap config fetch failed', error, { module: 'bootstrap-config' });
      return {
        error: error.message,
        code: error.code || 'query_error'
      };
    }
    
    if (!data || data.length === 0) {
      logger.info('No connection settings found in database', { module: 'bootstrap-config' });
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
      logger.warn('Incomplete connection settings found', { module: 'bootstrap-config' });
      return {
        error: 'Incomplete configuration in database',
        code: 'incomplete_config'
      };
    }
    
    logger.info('Successfully retrieved bootstrap config', { 
      module: 'bootstrap-config',
      url: config.supabase_url.split('//')[1]
    });
    
    return {
      config: {
        url: config.supabase_url,
        anonKey: config.supabase_anon_key,
        serviceKey: config.supabase_service_key,
        isInitialized: config.supabase_initialized === 'true',
        lastConnection: config.supabase_last_connection
      }
    };
    
  } catch (error) {
    logger.error('Error retrieving bootstrap config', error, { module: 'bootstrap-config' });
    
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
