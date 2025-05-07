
import { logger } from '@/utils/logging';
import { resetSupabaseClient } from '@/services/supabase/connection-service';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string; // Added for self-healing operations
  isInitialized: boolean;
}

// Storage key for Supabase configuration
const STORAGE_KEY = 'spark_supabase_config';

// Environment detection - now more precise
export const isDevelopment = () => {
  const hostname = window.location.hostname;
  
  // Log the hostname for debugging only once
  logger.info(`Checking isDevelopment for hostname: ${hostname}`, {
    module: 'supabase-config',
    once: true
  });

  // Direct check for localhost and 127.0.0.1 which are definitely development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    logger.info(`Hostname ${hostname} is a local development environment`, {
      module: 'supabase-config'
    });
    return true;
  }

  // Everything else is considered production
  logger.info(`Hostname ${hostname} is considered a production environment`, {
    module: 'supabase-config'
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
    logger.info(`Stored config exists = ${hasConfig}`, {
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
    
    // If stored config exists, return it
    if (storedConfig) {
      const config = JSON.parse(storedConfig) as SupabaseConfig;
      logger.info('Using stored Supabase configuration', {
        module: 'supabase-config',
        url: config.url.split('//')[1], // Log domain only for security
        once: true
      });
      return config;
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
    // Add a timestamp to the saved config
    const configWithTimestamp = {
      ...config,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configWithTimestamp));
    logger.info('Supabase configuration saved to storage', {
      module: 'supabase-config',
      url: config.url.split('//')[1] // Log domain only for security
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
    const defaultConfig = getDefaultConfig();
    return saveConfig(defaultConfig);
  } catch (e) {
    logger.error('Error forcing default config', e);
    return false;
  }
}

/**
 * Get hardcoded default Supabase configuration for development
 * This is used as a fallback when no configuration is available
 */
export function getDefaultConfig(): SupabaseConfig {
  logger.warn('⚠️ Using hardcoded Supabase credentials - FOR DEVELOPMENT ONLY ⚠️', {
    module: 'supabase-config',
    once: true
  });
  
  return {
    url: "https://ymtdtzkskjdqlzhjuesk.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdGR0emtza2pkcWx6aGp1ZXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjUyNDYsImV4cCI6MjA2MDUwMTI0Nn0.sOQdxH63edhcIgjx6mxjHkeam4IQGViaWYLdFDepIaE",
    isInitialized: true
  };
}
