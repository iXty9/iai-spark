
import { logger } from '@/utils/logging';
import { SupabaseConfig } from './types';
import { getConfigStorageKey, getEnvironmentId, isDevelopment } from './environment';
import { resetSupabaseClient } from '@/services/supabase/connection-service';

/**
 * Check if Supabase configuration exists in local storage
 */
export function hasStoredConfig(): boolean {
  try {
    // Check for force_init parameter first - this overrides default behavior
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    // If forcing initialization, don't use stored config
    if (forceInit) {
      logger.info('Force init parameter detected, bypassing stored config', {
        module: 'supabase-config'
      });
      return false;
    }
    
    // Check if there's a stored configuration using the environment-specific key
    const configKey = getConfigStorageKey();
    const storedConfig = localStorage.getItem(configKey);
    const hasConfig = !!storedConfig;
    
    // Log detailed information about the stored config state
    const hostname = window.location.hostname;
    logger.info(`Stored config exists = ${hasConfig} for ${hostname} (key: ${configKey})`, {
      module: 'supabase-config'
    });
    
    return hasConfig;
  } catch (e) {
    logger.error('Error checking for stored Supabase config', e);
    return false;
  }
}

/**
 * Get Supabase configuration from local storage
 */
export function getStoredConfig(): SupabaseConfig | null {
  try {
    const configKey = getConfigStorageKey();
    const storedConfig = localStorage.getItem(configKey);
    const hostname = window.location.hostname;
    
    // If stored config exists, return it
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig) as SupabaseConfig;
        
        // Add environment information if not already present
        if (!config.environment) {
          config.environment = hostname;
        }
        
        logger.info('Using stored Supabase configuration', {
          module: 'supabase-config',
          url: config.url ? config.url.split('//')[1] : 'undefined', // Log domain only for security
          environment: config.environment,
          thisEnvironment: hostname,
          configKey,
          once: true
        });
        return config;
      } catch (parseError) {
        logger.error('Error parsing stored config, clearing invalid config', parseError);
        localStorage.removeItem(configKey);
        return null;
      }
    }
    
    // Check for force_init parameter - don't use default if forcing init
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    if (forceInit) {
      logger.info('Force init parameter detected, not using default config', {
        module: 'supabase-config'
      });
      return null;
    }
    
    // No stored config
    return null;
  } catch (e) {
    logger.error('Error retrieving Supabase config from storage', e);
    return null;
  }
}

/**
 * Get default configuration for development environments only
 * This is only used as a fallback when no stored configuration exists
 */
export function getDefaultConfig(): SupabaseConfig {
  return {
    url: '',
    anonKey: '',
    isInitialized: false,
    environment: 'default_' + getEnvironmentId()
  };
}

/**
 * Save Supabase configuration to local storage
 */
export function saveConfig(config: SupabaseConfig): boolean {
  try {
    const configKey = getConfigStorageKey();
    // Add a timestamp and environment info to the saved config
    const configWithMeta = {
      ...config,
      savedAt: new Date().toISOString(),
      environment: window.location.hostname
    };
    
    localStorage.setItem(configKey, JSON.stringify(configWithMeta));
    logger.info('Supabase configuration saved to storage', {
      module: 'supabase-config',
      url: config.url ? config.url.split('//')[1] : 'undefined', // Log domain only for security
      environment: configWithMeta.environment,
      configKey
    });
    return true;
  } catch (e) {
    logger.error('Error saving Supabase config to storage', e);
    return false;
  }
}

/**
 * Clear stored Supabase configuration
 */
export function clearConfig(): void {
  try {
    const configKey = getConfigStorageKey();
    localStorage.removeItem(configKey);
    
    // Also reset the Supabase client to ensure a complete reset
    resetSupabaseClient();
    
    logger.info('Supabase configuration cleared and client reset successfully', {
      module: 'supabase-config',
      configKey
    });
  } catch (e) {
    logger.error('Error clearing Supabase config', e);
  }
}

/**
 * Clear all environment-specific configurations
 * Useful when migrating to a new environment
 */
export function clearAllEnvironmentConfigs(): void {
  try {
    // Find and clear all Supabase configuration keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('spark_supabase_config')) {
        localStorage.removeItem(key);
      }
    }
    
    // Reset the Supabase client
    resetSupabaseClient();
    
    logger.info('All environment-specific Supabase configurations cleared', {
      module: 'supabase-config'
    });
  } catch (e) {
    logger.error('Error clearing all environment configs', e);
  }
}
