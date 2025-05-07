
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

// Storage key for Supabase configuration
const STORAGE_KEY = 'spark_supabase_config';
const ENV_KEY = 'spark_supabase_env';

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
    
    // Check if there's a stored configuration
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    const hasConfig = !!storedConfig;
    
    // Log detailed information about the stored config state
    const hostname = window.location.hostname;
    logger.info(`Stored config exists = ${hasConfig} for ${hostname}`, {
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
    const storedConfig = localStorage.getItem(STORAGE_KEY);
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
          url: config.url.split('//')[1], // Log domain only for security
          environment: config.environment,
          thisEnvironment: hostname,
          once: true
        });
        return config;
      } catch (parseError) {
        logger.error('Error parsing stored config, clearing invalid config', parseError);
        localStorage.removeItem(STORAGE_KEY);
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
 * Save Supabase configuration to local storage
 */
export function saveConfig(config: SupabaseConfig): boolean {
  try {
    // Add a timestamp and environment info to the saved config
    const configWithMeta = {
      ...config,
      savedAt: new Date().toISOString(),
      environment: window.location.hostname
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configWithMeta));
    logger.info('Supabase configuration saved to storage', {
      module: 'supabase-config',
      url: config.url.split('//')[1], // Log domain only for security
      environment: configWithMeta.environment
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
    localStorage.removeItem(STORAGE_KEY);
    
    // Also reset the Supabase client to ensure a complete reset
    resetSupabaseClient();
    
    logger.info('Supabase configuration cleared and client reset successfully', {
      module: 'supabase-config'
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
      environment: 'default'
    };
    return saveConfig(defaultConfig);
  } catch (e) {
    logger.error('Error forcing default config', e);
    return false;
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
