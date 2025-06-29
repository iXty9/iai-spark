
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { createConfig, validateRequiredFields } from './config-factory';

/**
 * Helper functions for creating ConfigLoadResult objects
 */
export function createErrorResult(source: ConfigSource, error: string): ConfigLoadResult {
  return { config: null, source, error };
}

export function createSuccessResult(config: any, source: ConfigSource): ConfigLoadResult {
  const error = validateRequiredFields(config, ['supabaseUrl', 'supabaseAnonKey']);
  if (error) {
    return createErrorResult(source, error);
  }
  
  return {
    config: createConfig(config.supabaseUrl, config.supabaseAnonKey),
    source
  };
}
