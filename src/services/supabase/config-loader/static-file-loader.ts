
import { logger } from '@/utils/logging';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { createConfig, isEmptyValue } from './config-factory';
import { createErrorResult } from './result-helpers';

/**
 * Load configuration from static file with retries
 */
export async function loadFromStaticFile(): Promise<ConfigLoadResult> {
  const MAX_RETRIES = 3;
  let retries = MAX_RETRIES;
  let staticConfig = null;
  let lastError;
  
  logger.info('Attempting to load config from static file', { module: 'config-loader' });
  
  while (retries > 0 && !staticConfig) {
    try {
      staticConfig = await fetchStaticSiteConfig();
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        const delayMs = 500 * (MAX_RETRIES - retries);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  if (!staticConfig) {
    const errorMessage = lastError instanceof Error ? lastError.message : 'Static config fetch failed';
    logger.error('Failed to load static config after retries', lastError, { module: 'config-loader' });
    return createErrorResult(ConfigSource.STATIC_FILE, errorMessage);
  }
  
  // Validate and repair URL if needed
  const { isValidUrl, attemptUrlFormatRepair } = await import('../config-validation');
  let url = staticConfig.supabaseUrl;
  
  if (!isValidUrl(url ?? '')) {
    url = attemptUrlFormatRepair(url ?? '') || url;
  }
  
  if (isEmptyValue(url) || isEmptyValue(staticConfig.supabaseAnonKey)) {
    return createErrorResult(ConfigSource.STATIC_FILE, 'Static config contains empty values');
  }
  
  const config = createConfig(url, staticConfig.supabaseAnonKey);
  logger.info('Successfully loaded config from static file', { module: 'config-loader' });
  return { config, source: ConfigSource.STATIC_FILE };
}
