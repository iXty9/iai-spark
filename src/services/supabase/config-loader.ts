
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { ConfigSource, ConfigLoadResult, ConfigLoader } from './config-loader-types';
import { loadConfiguration } from './config-loader/main-loader';
import { saveConfiguration } from './config-loader/config-saver';

// Re-export types and constants
export { ConfigSource };
export type { ConfigLoadResult };

// Re-export individual loaders for backwards compatibility
export { loadFromUrlParameters } from './config-loader/url-loader';
export { loadFromStaticFile } from './config-loader/static-file-loader';
export { loadFromLocalStorage, loadFromEnvironment } from './config-loader/storage-loaders';
export { loadFromDatabase, getDefaultConfig } from './config-loader/database-loader';

// Export main functions
export { loadConfiguration, saveConfiguration };

// Export the config loader interface
export const configLoader: ConfigLoader = { 
  loadConfiguration, 
  saveConfiguration 
};
