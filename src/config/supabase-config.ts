
// This file now serves as a barrel export for the Supabase config modules
// This makes the code more maintainable by splitting it into logical modules

// Re-export from environment
export { 
  getEnvironmentId, 
  isDevelopment, 
  getEnvironmentType, 
  getEnvironmentInfo,
  setEnvironmentOverride,
  clearEnvironmentOverride,
  EnvironmentType
} from './supabase/environment';

// Re-export from storage
export {
  hasStoredConfig,
  getStoredConfig,
  getDefaultConfig,
  saveConfig,
  clearConfig,
  clearAllEnvironmentConfigs
} from './supabase/storage';

// Re-export types
export type { SupabaseConfig } from './supabase/types';

// Add utilities specific to this module
import { getStoredConfig } from './supabase/storage';
import { resetSupabaseClient } from '@/services/supabase/connection-service';
import { logger } from '@/utils/logging';
import { clearConfig } from './supabase/storage';

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

/**
 * Clear configuration and reset client
 * This combines both operations to ensure they happen together
 */
export function clearConfigAndResetClient(): void {
  try {
    // First clear the configuration
    clearConfig();
    
    // Then reset the Supabase client
    resetSupabaseClient();
    
    logger.info('Configuration cleared and client reset', {
      module: 'supabase-config'
    });
  } catch (error) {
    logger.error('Error clearing configuration and resetting client', error, {
      module: 'supabase-config'
    });
  }
}

/**
 * Check if configuration is valid
 */
export function isConfigValid(config: any): boolean {
  if (!config) return false;
  
  // Check required fields
  if (!config.url || typeof config.url !== 'string' || !config.url.trim()) {
    return false;
  }
  
  if (!config.anonKey || typeof config.anonKey !== 'string' || !config.anonKey.trim()) {
    return false;
  }
  
  // Check URL format
  try {
    new URL(config.url);
  } catch (e) {
    return false;
  }
  
  return true;
}
