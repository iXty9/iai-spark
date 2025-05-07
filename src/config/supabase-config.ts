
// This file now serves as a barrel export for the Supabase config modules
// This makes the code more maintainable by splitting it into logical modules

// Re-export from environment
export { getEnvironmentId, isDevelopment } from './supabase/environment';

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
