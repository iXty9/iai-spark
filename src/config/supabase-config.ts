
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

// List of known custom production domains 
const KNOWN_PRODUCTION_DOMAINS = [
  'ixty.ai',
  'iai-spark.lovable.app' // Include the production Lovable app domain
];

// Environment detection - improved to be more specific
export const isDevelopment = () => {
  const hostname = window.location.hostname;
  // Log the hostname for debugging
  logger.info(`Checking isDevelopment for hostname: ${hostname}`, {
    module: 'supabase-config',
    once: true
  });

  // Check if this is one of our known production domains
  const isKnownProductionDomain = KNOWN_PRODUCTION_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );
  
  // If it's a known production domain, it's definitely not development
  if (isKnownProductionDomain) {
    logger.info(`Hostname ${hostname} matched known production domain`, {
      module: 'supabase-config'
    });
    return false;
  }
  
  // Check for local development environments
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Log additional information to help diagnose issues
  logger.info(`Hostname ${hostname} isDevelopment check result: ${isDev}`, {
    module: 'supabase-config'
  });
  
  return isDev;
};

/**
 * Check if Supabase configuration exists in local storage
 * In development mode, will return true even if no config is stored
 */
export function hasStoredConfig(): boolean {
  try {
    // Check for force_init parameter first - this overrides default behavior
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    // If forcing initialization, don't use or create default config
    if (forceInit) {
      logger.info('Force init parameter detected, bypassing default config', {
        module: 'supabase-config'
      });
      
      // Check if there's actually a stored config despite force_init
      const storedConfig = localStorage.getItem(STORAGE_KEY);
      return !!storedConfig && !forceInit;
    }
    
    // Check if there's already a stored configuration
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    const hasConfig = !!storedConfig;
    
    // Log detailed information about the stored config state
    logger.info(`Stored config exists = ${hasConfig}`, {
      module: 'supabase-config'
    });
    
    if (hasConfig) {
      // If config exists, always use it
      return true;
    }
    
    // In development without a stored config, we can use hardcoded defaults only as a fallback
    if (isDevelopment()) {
      logger.warn('No stored config found in development. Default config will be used as fallback.', {
        module: 'supabase-config'
      });
      return false;
    }
    
    // In production without config, return false
    return false;
  } catch (e) {
    logger.error('Error checking for stored Supabase config', e);
    return false;
  }
}

/**
 * Get Supabase configuration from local storage
 * In development, will return default config if none is stored
 */
export function getStoredConfig(): SupabaseConfig | null {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    
    // If stored config exists, return it
    if (storedConfig) {
      const config = JSON.parse(storedConfig) as SupabaseConfig;
      logger.info('Using stored Supabase configuration', {
        module: 'supabase-config',
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
    
    // No stored config and not forcing init
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    logger.info('Supabase configuration saved to storage', {
      module: 'supabase-config'
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
 * 
 * ⚠️ SECURITY WARNING ⚠️
 * These credentials should be replaced before production deployment.
 * They are only meant for development and testing purposes.
 * In a production environment, proper configuration must be done
 * during the initialization process.
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
