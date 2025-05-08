/**
 * Unified configuration loader service
 * Provides a standardized approach to loading Supabase configuration
 * with clear priority order and error handling
 */

import { logger } from '@/utils/logging';
import { fetchStaticSiteConfig, getConfigFromEnvironment, readConfigFromLocalStorage, writeConfigToLocalStorage, clearLocalStorageConfig, convertSupabaseConfigToSiteConfig, convertSiteConfigToSupabaseConfig } from '@/services/site-config/site-config-file-service';
import { fetchBootstrapConfig, testBootstrapConnection } from '@/services/supabase/bootstrap-service';
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';
import { ConfigSource, ConfigLoadResult, ConfigLoader } from './config-loader-types';
import { validateConfig } from './config-validation';

// Re-export types for backward compatibility
export { ConfigSource };
export type { ConfigLoadResult };

// Implement the ConfigLoader interface
const configLoaderImpl: ConfigLoader = {
  loadConfiguration,
  saveConfiguration
};

// Export the implementation
export const configLoader = configLoaderImpl;

/**
 * Load configuration from URL parameters
 * Highest priority - allows explicit overrides
 */
export async function loadFromUrlParameters(): Promise<ConfigLoadResult> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for different possible parameter names
    const publicUrl = urlParams.get('public_url') || urlParams.get('supabase_url');
    const publicKey = urlParams.get('public_key') || urlParams.get('supabase_key') || urlParams.get('anon_key');
    
    if (!publicUrl || !publicKey) {
      return { config: null, source: ConfigSource.URL_PARAMETERS };
    }
    
    // Check if values are empty strings
    if (!publicUrl.trim() || !publicKey.trim()) {
      logger.warn('URL parameters contain empty values', {
        module: 'config-loader',
        hasUrlParam: !!publicUrl,
        hasKeyParam: !!publicKey
      });
      
      return { 
        config: null, 
        source: ConfigSource.URL_PARAMETERS,
        error: 'URL parameters contain empty values'
      };
    }
    
    logger.info('Found potential configuration in URL parameters', {
      module: 'config-loader'
    });
    
    // Test if the connection works with enhanced testing
    const connectionTest = await testBootstrapConnection(publicUrl, publicKey);
    
    if (!connectionTest.isConnected) {
      logger.warn('URL parameter configuration failed connection test', {
        module: 'config-loader',
        error: connectionTest.error,
        errorCode: connectionTest.errorCode
      });
      return { 
        config: null, 
        source: ConfigSource.URL_PARAMETERS,
        error: `Connection test failed: ${connectionTest.error}`
      };
    }
    
    // Try to bootstrap from these credentials
    const bootstrapResult = await fetchBootstrapConfig(publicUrl, publicKey);
    
    if ('error' in bootstrapResult) {
      logger.warn('Bootstrap failed for URL parameters', {
        module: 'config-loader',
        error: bootstrapResult.error,
        code: bootstrapResult.code
      });
      
      return { 
        config: null, 
        source: ConfigSource.URL_PARAMETERS,
        error: `Bootstrap failed: ${bootstrapResult.error}`
      };
    }
    
    logger.info('Successfully loaded configuration from URL parameters', {
      module: 'config-loader'
    });
    
    // Create config object
    const configObj = {
      url: bootstrapResult.url,
      anonKey: bootstrapResult.anonKey,
      serviceKey: bootstrapResult.serviceKey,
      isInitialized: bootstrapResult.isInitialized || true,
      savedAt: new Date().toISOString(),
      environment: getEnvironmentId()
    };
    
    // Validate the configuration
    const validation = validateConfig(configObj);
    
    if (!validation.valid) {
      logger.warn('URL parameter configuration validation failed', {
        module: 'config-loader',
        errors: validation.errors
      });
      
      return {
        config: null,
        source: ConfigSource.URL_PARAMETERS,
        error: `Configuration validation failed: ${validation.errors?.join(', ')}`
      };
    }
    
    return {
      config: validation.config,
      source: ConfigSource.URL_PARAMETERS
    };
  } catch (error) {
    logger.error('Error loading configuration from URL parameters', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.URL_PARAMETERS,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load configuration from static site config file
 * Second priority - deployment-specific settings
 */
export async function loadFromStaticFile(): Promise<ConfigLoadResult> {
  try {
    logger.info('Attempting to load static site config file', {
      module: 'config-loader'
    });
    
    // Add retry mechanism for fetching the static config
    let retries = 3;
    let staticConfig = null;
    let lastError = null;
    
    while (retries > 0 && !staticConfig) {
      try {
        logger.info(`Static config fetch attempt ${4-retries}/3`, {
          module: 'config-loader'
        });
        
        staticConfig = await fetchStaticSiteConfig();
        
        if (staticConfig) {
          logger.info('Static config fetch successful', {
            module: 'config-loader'
          });
          break;
        } else {
          logger.warn(`Static config fetch returned null on attempt ${4-retries}`, {
            module: 'config-loader'
          });
        }
      } catch (e) {
        lastError = e;
        logger.warn(`Static config fetch attempt failed, ${retries-1} retries left`, {
          module: 'config-loader',
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      retries--;
      // Wait before retry with increasing delay
      await new Promise(resolve => setTimeout(resolve, 500 * (4-retries)));
    }
    
    if (!staticConfig) {
      logger.error('All static config fetch attempts failed', {
        module: 'config-loader',
        lastError: lastError instanceof Error ? lastError.message : String(lastError)
      });
      return { 
        config: null, 
        source: ConfigSource.STATIC_FILE,
        error: lastError instanceof Error ? lastError.message : 'Failed to fetch static config'
      };
    }
    
    // Check for empty string values in the config
    if (!staticConfig.supabaseUrl || !staticConfig.supabaseUrl.trim() || 
        !staticConfig.supabaseAnonKey || !staticConfig.supabaseAnonKey.trim()) {
      logger.warn('Static site config contains empty values', {
        module: 'config-loader',
        hasUrl: !!staticConfig.supabaseUrl,
        hasAnonKey: !!staticConfig.supabaseAnonKey
      });
      
      return {
        config: null,
        source: ConfigSource.STATIC_FILE,
        error: 'Static site config contains empty or invalid values'
      };
    }
    
    logger.info('Successfully loaded static site config file', {
      module: 'config-loader',
      host: staticConfig.siteHost,
      hasUrl: !!staticConfig.supabaseUrl,
      hasAnonKey: !!staticConfig.supabaseAnonKey
    });
    
    // Validate the config before returning
    if (!staticConfig.supabaseUrl || !staticConfig.supabaseAnonKey) {
      logger.error('Static config is missing required fields', {
        module: 'config-loader',
        hasUrl: !!staticConfig.supabaseUrl,
        hasAnonKey: !!staticConfig.supabaseAnonKey
      });
      
      return {
        config: null,
        source: ConfigSource.STATIC_FILE,
        error: 'Static config is missing required fields'
      };
    }
    
    const config = {
      url: staticConfig.supabaseUrl.trim(),
      anonKey: staticConfig.supabaseAnonKey.trim(),
      isInitialized: true,
      savedAt: new Date().toISOString(),
      environment: getEnvironmentId()
    };
    
    // Log the actual values to help with debugging (partial values for security)
    logger.info('Static config values:', {
      module: 'config-loader',
      urlPrefix: config.url.substring(0, 12) + '...',
      anonKeyPrefix: config.anonKey.substring(0, 10) + '...',
      environment: config.environment
    });
    
    return {
      config,
      source: ConfigSource.STATIC_FILE
    };
  } catch (error) {
    logger.error('Error loading static site config file', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.STATIC_FILE,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load configuration from localStorage
 * Third priority - for returning users
 */
export function loadFromLocalStorage(): ConfigLoadResult {
  try {
    logger.info('Attempting to load configuration from localStorage', {
      module: 'config-loader'
    });
    
    const localConfig = readConfigFromLocalStorage();
    
    if (!localConfig) {
      return { config: null, source: ConfigSource.LOCAL_STORAGE };
    }
    
    // Check for empty string values in the config
    if (!localConfig.supabaseUrl || !localConfig.supabaseUrl.trim() || 
        !localConfig.supabaseAnonKey || !localConfig.supabaseAnonKey.trim()) {
      logger.warn('localStorage config contains empty values', {
        module: 'config-loader',
        hasUrl: !!localConfig.supabaseUrl,
        hasAnonKey: !!localConfig.supabaseAnonKey
      });
      
      // Clear the invalid local storage config
      clearLocalStorageConfig();
      
      return { 
        config: null, 
        source: ConfigSource.LOCAL_STORAGE,
        error: 'Local storage config contains empty values'
      };
    }
    
    logger.info('Successfully loaded configuration from localStorage', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: localConfig.supabaseUrl.trim(),
        anonKey: localConfig.supabaseAnonKey.trim(),
        isInitialized: true,
        savedAt: new Date().toISOString(),
        environment: getEnvironmentId()
      },
      source: ConfigSource.LOCAL_STORAGE
    };
  } catch (error) {
    logger.error('Error loading configuration from localStorage', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.LOCAL_STORAGE,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load configuration from environment variables
 * Fourth priority - for development
 */
export function loadFromEnvironment(): ConfigLoadResult {
  try {
    logger.info('Attempting to load configuration from environment variables', {
      module: 'config-loader'
    });
    
    const envConfig = getConfigFromEnvironment();
    
    if (!envConfig) {
      return { config: null, source: ConfigSource.ENVIRONMENT };
    }
    
    // Check for empty string values in the config
    if (!envConfig.supabaseUrl || !envConfig.supabaseUrl.trim() || 
        !envConfig.supabaseAnonKey || !envConfig.supabaseAnonKey.trim()) {
      logger.warn('Environment variables contain empty values', {
        module: 'config-loader',
        hasUrl: !!envConfig.supabaseUrl,
        hasAnonKey: !!envConfig.supabaseAnonKey
      });
      
      return { 
        config: null, 
        source: ConfigSource.ENVIRONMENT,
        error: 'Environment variables contain empty values'
      };
    }
    
    logger.info('Successfully loaded configuration from environment variables', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: envConfig.supabaseUrl.trim(),
        anonKey: envConfig.supabaseAnonKey.trim(),
        isInitialized: true,
        savedAt: new Date().toISOString(),
        environment: getEnvironmentId()
      },
      source: ConfigSource.ENVIRONMENT
    };
  } catch (error) {
    logger.error('Error loading configuration from environment', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.ENVIRONMENT,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Load configuration from database bootstrap
 * Fifth priority - fallback method
 */
export async function loadFromDatabase(defaultUrl?: string, defaultKey?: string): Promise<ConfigLoadResult> {
  try {
    if (!defaultUrl || !defaultKey || !defaultUrl.trim() || !defaultKey.trim()) {
      logger.warn('No default credentials available for database bootstrap', {
        module: 'config-loader',
        hasUrl: !!defaultUrl,
        hasKey: !!defaultKey
      });
      return { config: null, source: ConfigSource.DATABASE };
    }
    
    logger.info('Attempting to bootstrap from database', {
      module: 'config-loader'
    });
    
    const databaseUrl = defaultUrl.trim();
    const databaseKey = defaultKey.trim();
    
    // Fetch bootstrap config from database
    const bootstrapConfigResult = await fetchBootstrapConfig(databaseUrl, databaseKey);
    
    // Check if the result is an error object
    if ('error' in bootstrapConfigResult) {
      logger.warn('Failed to fetch bootstrap config from database', {
        module: 'config-loader',
        url: databaseUrl,
        error: bootstrapConfigResult.error
      });
      return { config: null, source: ConfigSource.DATABASE, error: bootstrapConfigResult.error };
    }
    
    // If it's not an error, it's a valid config
    const { url, anonKey, serviceKey, isInitialized } = bootstrapConfigResult;
    
    // Validate returned config
    if (!url || !url.trim() || !anonKey || !anonKey.trim()) {
      logger.warn('Database returned incomplete config', {
        module: 'config-loader',
        hasUrl: !!url,
        hasAnonKey: !!anonKey
      });
      
      return {
        config: null,
        source: ConfigSource.DATABASE,
        error: 'Database returned incomplete configuration'
      };
    }
    
    logger.info('Successfully bootstrapped from database', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: bootstrapConfigResult.url.trim(),
        anonKey: bootstrapConfigResult.anonKey.trim(),
        serviceKey: bootstrapConfigResult.serviceKey ? bootstrapConfigResult.serviceKey.trim() : undefined,
        isInitialized: bootstrapConfigResult.isInitialized || true,
        savedAt: new Date().toISOString(),
        environment: getEnvironmentId()
      },
      source: ConfigSource.DATABASE
    };
  } catch (error) {
    logger.error('Error bootstrapping from database', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.DATABASE,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get default configuration
 * Lowest priority - last resort
 */
export function getDefaultConfig(): ConfigLoadResult {
  try {
    // This should be customized based on your application's needs
    const defaultUrl = import.meta.env.VITE_DEFAULT_SUPABASE_URL || '';
    const defaultKey = import.meta.env.VITE_DEFAULT_SUPABASE_ANON_KEY || '';
    
    if (!defaultUrl || !defaultKey || !defaultUrl.trim() || !defaultKey.trim()) {
      return { config: null, source: ConfigSource.DEFAULT };
    }
    
    return {
      config: {
        url: defaultUrl.trim(),
        anonKey: defaultKey.trim(),
        isInitialized: false,
        savedAt: new Date().toISOString(),
        environment: getEnvironmentId()
      },
      source: ConfigSource.DEFAULT
    };
  } catch (error) {
    logger.error('Error getting default configuration', error, {
      module: 'config-loader'
    });
    return { 
      config: null, 
      source: ConfigSource.DEFAULT,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main function to load configuration from all sources in priority order
 * Returns the first valid configuration found
 */
export async function loadConfiguration(): Promise<ConfigLoadResult> {
  logger.info('Starting unified configuration loading sequence', {
    module: 'config-loader'
  });
  
  // 1. Try URL parameters (highest priority)
  const urlConfig = await loadFromUrlParameters();
  if (urlConfig.config) {
    // Save to localStorage for future use
    const siteConfig = convertSupabaseConfigToSiteConfig(urlConfig.config);
    writeConfigToLocalStorage(siteConfig);
    return urlConfig;
  }
  
  // 2. Try static site config file
  const staticConfig = await loadFromStaticFile();
  if (staticConfig.config) {
    // Save to localStorage for future use
    const siteConfig = convertSupabaseConfigToSiteConfig(staticConfig.config);
    writeConfigToLocalStorage(siteConfig);
    return staticConfig;
  }
  
  // 3. Try localStorage
  const localConfig = loadFromLocalStorage();
  if (localConfig.config) {
    return localConfig;
  }
  
  // 4. Try environment variables
  const envConfig = loadFromEnvironment();
  if (envConfig.config) {
    // Save to localStorage for future use
    const siteConfig = convertSupabaseConfigToSiteConfig(envConfig.config);
    writeConfigToLocalStorage(siteConfig);
    return envConfig;
  }
  
  // 5. Try database bootstrap (using default config if available)
  const defaultConfig = getDefaultConfig();
  if (defaultConfig.config) {
    const dbConfig = await loadFromDatabase(
      defaultConfig.config.url,
      defaultConfig.config.anonKey
    );
    
    if (dbConfig.config) {
      // Save to localStorage for future use
      const siteConfig = convertSupabaseConfigToSiteConfig(dbConfig.config);
      writeConfigToLocalStorage(siteConfig);
      return dbConfig;
    }
    
    // If all else fails, return the default config
    return defaultConfig;
  }
  
  // No configuration found
  logger.warn('No configuration found from any source', {
    module: 'config-loader'
  });
  
  return {
    config: null,
    source: ConfigSource.NONE,
    error: 'No configuration found from any source'
  };
}

/**
 * Save configuration to localStorage and optionally to other storage mechanisms
 */
export function saveConfiguration(config: SupabaseConfig): boolean {
  try {
    if (!config) {
      logger.error('Cannot save null configuration', {
        module: 'config-loader'
      });
      return false;
    }
    
    // Validate config before saving
    const validation = validateConfig(config);
    
    if (!validation.valid) {
      logger.error('Cannot save invalid configuration', {
        module: 'config-loader',
        errors: validation.errors
      });
      return false;
    }
    
    // Log the config being saved for debugging
    logger.debug('Saving configuration', {
      module: 'config-loader',
      hasUrl: !!config.url,
      hasAnonKey: !!config.anonKey,
      urlPrefix: config.url ? config.url.substring(0, 10) + '...' : 'none'
    });
    
    // Convert to SiteConfigEnv format for localStorage
    const siteConfig = convertSupabaseConfigToSiteConfig(config);
    
    // Always save to localStorage
    const localSaved = writeConfigToLocalStorage(siteConfig);
    
    if (!localSaved) {
      logger.warn('Failed to save configuration to localStorage', {
        module: 'config-loader'
      });
      
      // Try direct localStorage save as fallback
      try {
        const storageKey = getEnvironmentId();
        localStorage.setItem(`spark_supabase_config_${storageKey}`, JSON.stringify(config));
        logger.info('Saved configuration using direct localStorage method', {
          module: 'config-loader'
        });
        return true;
      } catch (storageError) {
        logger.error('Direct localStorage save also failed', storageError, {
          module: 'config-loader'
        });
      }
    }
    
    // Could add other storage mechanisms here
    
    return true;
  } catch (error) {
    logger.error('Error saving configuration', error, {
      module: 'config-loader'
    });
    return false;
  }
}
