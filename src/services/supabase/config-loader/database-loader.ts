
import { logger } from '@/utils/logging';
import { fetchBootstrapConfig } from '@/services/supabase/bootstrap-service';
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { createConfig, isEmptyValue } from './config-factory';
import { createErrorResult } from './result-helpers';

/**
 * Load configuration from database
 */
export async function loadFromDatabase(defaultUrl?: string, defaultKey?: string): Promise<ConfigLoadResult> {
  try {
    logger.info('Attempting to load config from database', { module: 'config-loader' });
    
    if (isEmptyValue(defaultUrl) || isEmptyValue(defaultKey)) {
      return createErrorResult(ConfigSource.DATABASE, 'No default credentials for database connection');
    }
    
    const bootstrapConfig = await fetchBootstrapConfig(defaultUrl!.trim(), defaultKey!.trim());
    if ('error' in bootstrapConfig && bootstrapConfig.error) {
      return createErrorResult(ConfigSource.DATABASE, bootstrapConfig.error || 'Bootstrap config error');
    }
    
    if (!bootstrapConfig.config || isEmptyValue(bootstrapConfig.config.url) || isEmptyValue(bootstrapConfig.config.anonKey)) {
      return createErrorResult(ConfigSource.DATABASE, 'Database returned incomplete config');
    }
    
    logger.info('Successfully loaded config from database', { module: 'config-loader' });
    return { 
      config: createConfig(
        bootstrapConfig.config.url, 
        bootstrapConfig.config.anonKey, 
        bootstrapConfig.config.serviceKey, 
        bootstrapConfig.config.isInitialized ?? true
      ), 
      source: ConfigSource.DATABASE 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load config from database', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.DATABASE, errorMessage);
  }
}

/**
 * Get default configuration from environment
 */
export function getDefaultConfig(): ConfigLoadResult {
  try {
    const url = import.meta.env.VITE_DEFAULT_SUPABASE_URL || '';
    const key = import.meta.env.VITE_DEFAULT_SUPABASE_ANON_KEY || '';
    
    if (isEmptyValue(url) || isEmptyValue(key)) {
      return { config: null, source: ConfigSource.DEFAULT };
    }
    
    return { 
      config: createConfig(url, key, undefined, false), 
      source: ConfigSource.DEFAULT 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get default config', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.DEFAULT, errorMessage);
  }
}
