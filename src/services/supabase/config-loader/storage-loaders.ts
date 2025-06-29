
import { logger } from '@/utils/logging';
import {
  readConfigFromLocalStorage,
  clearLocalStorageConfig,
  getConfigFromEnvironment
} from '@/services/site-config/site-config-file-service';
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { createConfig, isEmptyValue } from './config-factory';
import { createErrorResult } from './result-helpers';

/**
 * Load configuration from local storage
 */
export function loadFromLocalStorage(): ConfigLoadResult {
  try {
    logger.info('Attempting to load config from local storage', { module: 'config-loader' });
    
    const localConfig = readConfigFromLocalStorage();
    if (!localConfig || isEmptyValue(localConfig.supabaseUrl) || isEmptyValue(localConfig.supabaseAnonKey)) {
      clearLocalStorageConfig();
      return createErrorResult(ConfigSource.LOCAL_STORAGE, 'Local storage config contains empty values');
    }
    
    logger.info('Successfully loaded config from local storage', { module: 'config-loader' });
    return { 
      config: createConfig(localConfig.supabaseUrl, localConfig.supabaseAnonKey), 
      source: ConfigSource.LOCAL_STORAGE 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load config from local storage', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.LOCAL_STORAGE, errorMessage);
  }
}

/**
 * Load configuration from environment variables
 */
export function loadFromEnvironment(): ConfigLoadResult {
  try {
    logger.info('Attempting to load config from environment', { module: 'config-loader' });
    
    const envConfig = getConfigFromEnvironment();
    if (!envConfig || isEmptyValue(envConfig.supabaseUrl) || isEmptyValue(envConfig.supabaseAnonKey)) {
      return createErrorResult(ConfigSource.ENVIRONMENT, 'Environment variables are empty');
    }
    
    logger.info('Successfully loaded config from environment', { module: 'config-loader' });
    return { 
      config: createConfig(envConfig.supabaseUrl, envConfig.supabaseAnonKey), 
      source: ConfigSource.ENVIRONMENT 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load config from environment', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.ENVIRONMENT, errorMessage);
  }
}
