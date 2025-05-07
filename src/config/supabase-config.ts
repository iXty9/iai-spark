
import { logger } from '@/utils/logging';
import { resetSupabaseClient } from '@/services/supabase/connection-service';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string; // Added for self-healing operations
  isInitialized: boolean;
  savedAt?: string; // Timestamp when config was saved
  environment?: string; // Which environment this config was saved from
}

// Storage key for Supabase configuration - now with environment-specific keys
const BASE_STORAGE_KEY = 'spark_supabase_config';
const ENV_KEY = 'spark_supabase_env';

// Get environment-specific storage key to support multiple environments
function getConfigStorageKey() {
  const env = getEnvironmentId();
  return `${BASE_STORAGE_KEY}_${env}`;
}

// Generate a unique but consistent environment ID
export function getEnvironmentId(): string {
  const hostname = window.location.hostname;
  
  // Special case for localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }
  
  // For staging/preview environments (lovable.app domains)
  if (hostname.includes('lovable.app')) {
    return 'preview';
  }
  
  // For other environments, use a hash of the hostname
  // This ensures each domain gets its own config, but remains consistent
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = ((hash << 5) - hash) + hostname.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `env_${Math.abs(hash).toString(16)}`;
}

// Environment detection - now more precise
export const isDevelopment = () => {
  const hostname = window.location.hostname;
  
  // For debugging environment detection
  localStorage.setItem(ENV_KEY, hostname);
  
  // Log the hostname for debugging only once
  logger.info(`Running environment detection for hostname: ${hostname}`, {
    module: 'supabase-config',
    once: true
  });

  // Direct check for localhost and 127.0.0.1 which are definitely development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    logger.info(`Hostname ${hostname} is a local development environment`, {
      module: 'supabase-config',
      once: true
    });
    return true;
  }

  // Everything else is considered production
  logger.info(`Hostname ${hostname} is considered a production environment`, {
    module: 'supabase-config',
    once: true
  });
  return false;
};

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
 * Force save the default configuration
 * Useful for debugging or resetting to development defaults
 */
export function forceDefaultConfig(): boolean {
  try {
    const defaultConfig = {
      url: '',
      anonKey: '',
      isInitialized: false,
      environment: 'default_' + getEnvironmentId()
    };
    return saveConfig(defaultConfig);
  } catch (e) {
    logger.error('Error forcing default config', e);
    return false;
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
      if (key && key.startsWith(BASE_STORAGE_KEY)) {
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

/**
 * Safely get configuration URL, never returning hardcoded values
 */
export function getSafeConfigUrl(): string | null {
  const config = getStoredConfig();
  return config?.url || null;
}

/**
 * Safely get configuration anon key, never returning hardcoded values
 */
export function getSafeConfigAnonKey(): string | null {
  const config = getStoredConfig();
  return config?.anonKey || null;
}
