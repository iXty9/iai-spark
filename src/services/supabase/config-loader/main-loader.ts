
import { logger } from '@/utils/logging';
import { ConfigSource, ConfigLoadResult } from '../config-loader-types';
import { loadFromUrlParameters } from './url-loader';
import { loadFromStaticFile } from './static-file-loader';
import { loadFromLocalStorage, loadFromEnvironment } from './storage-loaders';
import { loadFromDatabase, getDefaultConfig } from './database-loader';
import { createErrorResult } from './result-helpers';
import {
  writeConfigToLocalStorage,
  convertSupabaseConfigToSiteConfig
} from '@/services/site-config/site-config-file-service';

/**
 * Main configuration loading orchestrator
 */
export async function loadConfiguration(): Promise<ConfigLoadResult> {
  logger.info('Starting configuration loading process', { module: 'config-loader' });
  
  const configLoaders = [
    () => loadFromUrlParameters(),
    () => loadFromStaticFile(),
    () => loadFromLocalStorage(),
    () => loadFromEnvironment(),
    async () => {
      const defaultConfig = getDefaultConfig();
      if (!defaultConfig.config) {
        return createErrorResult(ConfigSource.NONE, "No configuration found anywhere");
      }
      
      const databaseConfig = await loadFromDatabase(defaultConfig.config.url, defaultConfig.config.anonKey);
      return databaseConfig.config ? databaseConfig : defaultConfig;
    }
  ];
  
  for (const loader of configLoaders) {
    const result = await loader();
    if (result.config) {
      // Save to localStorage for all sources except LOCAL_STORAGE itself
      if (result.source !== ConfigSource.LOCAL_STORAGE) {
        const siteConfig = convertSupabaseConfigToSiteConfig(result.config);
        writeConfigToLocalStorage(siteConfig);
      }
      
      logger.info('Configuration loaded successfully', { 
        source: result.source, 
        module: 'config-loader' 
      });
      return result;
    }
  }
  
  logger.error('No configuration found from any source', { module: 'config-loader' });
  return createErrorResult(ConfigSource.NONE, 'No configuration found from any source');
}
