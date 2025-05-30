
import { logger } from '@/utils/logging';
import {
  fetchStaticSiteConfig,
  getConfigFromEnvironment,
  readConfigFromLocalStorage,
  writeConfigToLocalStorage,
  clearLocalStorageConfig,
  convertSupabaseConfigToSiteConfig,
  convertSiteConfigToSupabaseConfig
} from '@/services/site-config/site-config-file-service';
import { fetchBootstrapConfig, testBootstrapConnection } from '@/services/supabase/bootstrap-service';
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';
import { ConfigSource, ConfigLoadResult, ConfigLoader } from './config-loader-types';
import { validateConfig } from './config-validation';

export { ConfigSource };
export type { ConfigLoadResult };

function createConfig(url: string, anonKey: string, serviceKey?: string, isInitialized = true): SupabaseConfig {
  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    ...(serviceKey ? { serviceKey: serviceKey.trim() } : {}),
    isInitialized,
    savedAt: new Date().toISOString(),
    environment: getEnvironmentId()
  };
}

function createErrorResult(source: ConfigSource, error: string): ConfigLoadResult {
  return { config: null, source, error };
}

function isEmptyValue(value?: string): boolean {
  return !value || !value.trim();
}

function validateRequiredFields(config: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (isEmptyValue(config?.[field])) {
      return `Config contains empty or invalid value: ${field}`;
    }
  }
  return null;
}

function createSuccessResult(config: any, source: ConfigSource): ConfigLoadResult {
  const error = validateRequiredFields(config, ['supabaseUrl', 'supabaseAnonKey']);
  if (error) {
    return createErrorResult(source, error);
  }
  
  return {
    config: createConfig(config.supabaseUrl, config.supabaseAnonKey),
    source
  };
}

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
    if ('error' in bootstrapConfig) {
      return createErrorResult(ConfigSource.URL_PARAMETERS, `Bootstrap failed: ${bootstrapConfig.error}`);
    }
    
    const config = createConfig(
      bootstrapConfig.url, 
      bootstrapConfig.anonKey, 
      bootstrapConfig.serviceKey, 
      bootstrapConfig.isInitialized ?? true
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
  const { isValidUrl, attemptUrlFormatRepair } = await import('./config-validation');
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

export async function loadFromDatabase(defaultUrl?: string, defaultKey?: string): Promise<ConfigLoadResult> {
  try {
    logger.info('Attempting to load config from database', { module: 'config-loader' });
    
    if (isEmptyValue(defaultUrl) || isEmptyValue(defaultKey)) {
      return createErrorResult(ConfigSource.DATABASE, 'No default credentials for database connection');
    }
    
    const bootstrapConfig = await fetchBootstrapConfig(defaultUrl!.trim(), defaultKey!.trim());
    if ('error' in bootstrapConfig) {
      return createErrorResult(ConfigSource.DATABASE, bootstrapConfig.error || 'Bootstrap config error');
    }
    
    if (isEmptyValue(bootstrapConfig.url) || isEmptyValue(bootstrapConfig.anonKey)) {
      return createErrorResult(ConfigSource.DATABASE, 'Database returned incomplete config');
    }
    
    logger.info('Successfully loaded config from database', { module: 'config-loader' });
    return { 
      config: createConfig(
        bootstrapConfig.url, 
        bootstrapConfig.anonKey, 
        bootstrapConfig.serviceKey, 
        bootstrapConfig.isInitialized ?? true
      ), 
      source: ConfigSource.DATABASE 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load config from database', error, { module: 'config-loader' });
    return createErrorResult(ConfigSource.DATABASE, errorMessage);
  }
}

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

export function saveConfiguration(config: SupabaseConfig): boolean {
  try {
    if (!config) {
      logger.warn('Cannot save null config', { module: 'config-loader' });
      return false;
    }
    
    const validation = validateConfig(config);
    if (!validation.valid) {
      logger.warn('Cannot save invalid config', { 
        errors: validation.errors, 
        module: 'config-loader' 
      });
      return false;
    }
    
    const siteConfig = convertSupabaseConfigToSiteConfig(config);
    if (!writeConfigToLocalStorage(siteConfig)) {
      // Fallback storage method
      try {
        const storageKey = getEnvironmentId();
        localStorage.setItem(`spark_supabase_config_${storageKey}`, JSON.stringify(config));
        logger.info('Config saved using fallback method', { module: 'config-loader' });
        return true;
      } catch (fallbackError) {
        logger.error('Fallback config save failed', fallbackError, { module: 'config-loader' });
        return false;
      }
    }
    
    logger.info('Configuration saved successfully', { module: 'config-loader' });
    return true;
    
  } catch (error) {
    logger.error('Failed to save configuration', error, { module: 'config-loader' });
    return false;
  }
}

export const configLoader: ConfigLoader = { 
  loadConfiguration, 
  saveConfiguration 
};
