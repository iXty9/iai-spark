
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

// Re-export from utils (consolidated utilities)
export {
  validateSupabaseConfig,
  getSafeConfigUrl,
  getSafeConfigAnonKey,
  isValidSupabaseUrl,
  attemptUrlRepair
} from './supabase/utils';

// Re-export types
export type { SupabaseConfig } from './supabase/types';

// Simplified config management functions using consolidated utilities
import { getStoredConfig, clearConfig } from './supabase/storage';
import { getSafeConfigUrl, getSafeConfigAnonKey } from './supabase/utils';
import { resetSupabaseClient } from '@/services/supabase/connection-service';
import { logger } from '@/utils/logging';

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
 * Legacy wrapper for backwards compatibility
 * @deprecated Use validateSupabaseConfig from utils instead
 */
export function isConfigValid(config: any): boolean {
  const { validateSupabaseConfig } = require('./supabase/utils');
  const result = validateSupabaseConfig(config);
  return result.valid;
}
