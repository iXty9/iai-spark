import { logger } from '@/utils/logging';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isInitialized: boolean;
}

// Storage key for Supabase configuration
const STORAGE_KEY = 'spark_supabase_config';

// List of known custom production domains 
const KNOWN_PRODUCTION_DOMAINS = [
  'ixty.ai',
  'iai-spark.lovable.app' // Include the production Lovable app domain
];

// Environment detection
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
  
  // Otherwise, check if it's a development or preview domain
  const isDev = (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' ||
    hostname.includes('lovable.dev') ||
    hostname.includes('.lovable.app') ||
    hostname.includes('preview--') 
  );
  
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
    // In development, we can use hardcoded defaults to skip initialization
    if (isDevelopment()) {
      const storedConfig = localStorage.getItem(STORAGE_KEY);
      // If there's already a stored config, use that
      if (storedConfig) return true;
      
      // For development, save default config in localStorage to avoid initialization loop
      const defaultConfig = getDefaultConfig();
      const saved = saveConfig(defaultConfig);
      logger.info(`No stored config found in development. Default config saved: ${saved}`, {
        module: 'supabase-config'
      });
      return saved;
    }
    
    // In production, strictly require stored configuration
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    const hasConfig = !!storedConfig;
    
    // Log detailed information about the stored config state
    logger.info(`Production environment: stored config exists = ${hasConfig}`, {
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
 * In development, will return default config if none is stored
 */
export function getStoredConfig(): SupabaseConfig | null {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    
    // If stored config exists, return it
    if (storedConfig) {
      return JSON.parse(storedConfig) as SupabaseConfig;
    }
    
    // In development mode, save and return hardcoded defaults
    if (isDevelopment()) {
      const defaultConfig = getDefaultConfig();
      saveConfig(defaultConfig);
      return defaultConfig;
    }
    
    // In production with no config, return null
    return null;
  } catch (e) {
    logger.error('Error retrieving Supabase config from storage', e);
    
    // In development, save and return defaults even on error
    if (isDevelopment()) {
      const defaultConfig = getDefaultConfig();
      try {
        saveConfig(defaultConfig);
      } catch (e) {
        // Ignore error on saving
      }
      return defaultConfig;
    }
    
    return null;
  }
}

/**
 * Save Supabase configuration to local storage
 */
export function saveConfig(config: SupabaseConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
  return {
    url: "https://ymtdtzkskjdqlzhjuesk.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdGR0emtza2pkcWx6aGp1ZXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjUyNDYsImV4cCI6MjA2MDUwMTI0Nn0.sOQdxH63edhcIgjx6mxjHkeam4IQGViaWYLdFDepIaE",
    isInitialized: true
  };
}
