
/**
 * Type definitions for config loader to avoid circular dependencies
 */

import { SupabaseConfig } from '@/config/supabase/types';

// Configuration source types for tracking and analytics
export enum ConfigSource {
  URL_PARAMETERS = 'url_parameters',
  STATIC_FILE = 'static_file',
  LOCAL_STORAGE = 'local_storage',
  ENVIRONMENT = 'environment',
  DATABASE = 'database',
  DEFAULT = 'default',
  NONE = 'none'
}

// Configuration loading result with source tracking
export interface ConfigLoadResult {
  config: SupabaseConfig | null;
  source: ConfigSource;
  error?: string;
}

// Interface for the config loader service
export interface ConfigLoader {
  loadConfiguration: () => Promise<ConfigLoadResult>;
  saveConfiguration: (config: SupabaseConfig) => boolean;
}

// Do not re-export types here - they're already exported above
