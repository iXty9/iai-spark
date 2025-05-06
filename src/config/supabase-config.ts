
import { logger } from '@/utils/logging';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isInitialized: boolean;
}

// Storage key for Supabase configuration
const STORAGE_KEY = 'spark_supabase_config';

// Environment detection
export const isDevelopment = () => {
  return (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('lovable.dev') ||
    window.location.hostname.includes('.lovable.app')
  );
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
      saveConfig(defaultConfig);
      return true;
    }
    
    // In production, strictly require stored configuration
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    return !!storedConfig;
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
