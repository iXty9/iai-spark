
import { logger } from '@/utils/logging';
import { fetchBootstrapConfig, testBootstrapConnection } from '@/services/supabase/bootstrap-service';
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { createConfig, isEmptyValue } from './config-factory';
import { createErrorResult } from './result-helpers';
import { validateConfig } from '../config-validation';

/**
 * Load configuration from URL parameters
 */
export async function loadFromUrlParameters(): Promise<ConfigLoadResult> {
  try {
    logger.info('Attempting to load config from URL parameters', { module: 'config-loader' });
    
    const urlParams = new URLSearchParams(window.location.search);
    const publicUrl = urlParams.get('public_url') || urlParams.get('supabase_url');
    const publicKey = urlParams.get('public_key') || urlParams.get('supabase_key') || urlParams.get('anon_key');
    
    if (isEmptyValue(publicUrl) || isEmptyValue(publicKey)) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, 'URL parameters contain empty values');
    }
    
    const connectionTest = await testBootstrapConnection(publicUrl!, publicKey!);
    if (!connectionTest.isConnected) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, `Connection test failed: ${connectionTest.error}`);
    }
    
    const bootstrapConfig = await fetchBootstrapConfig(publicUrl!, publicKey!);
    if ('error' in bootstrapConfig && bootstrapConfig.error) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, `Bootstrap failed: ${bootstrapConfig.error}`);
    }
    
    if (!bootstrapConfig.config) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, 'Bootstrap config not found');
    }
    
    const config = createConfig(
      bootstrapConfig.config.url, 
      bootstrapConfig.config.anonKey, 
      bootstrapConfig.config.serviceKey, 
      bootstrapConfig.config.isInitialized ?? true
    );
    
    const validation = validateConfig(config);
    if (!validation.valid) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, `Validation failed: ${validation.errors?.join(', ')}`);
    }
    
    logger.info('Successfully loaded config from URL parameters', { module: 'config-loader' });
    return { config: validation.config, source: ConfigSource.URL_PARAMETERS };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load config from URL parameters', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.URL_PARAMETERS, errorMessage);
  }
}
