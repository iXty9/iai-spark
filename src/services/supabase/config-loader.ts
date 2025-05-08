/**
 * Unified configuration loader service
 * Provides a standardized approach to loading Supabase configuration
 * with clear priority order and error handling
 */

import { logger } from '@/utils/logging';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { getConfigFromEnvironment } from '@/services/site-config/site-config-file-service';
import { readConfigFromLocalStorage, writeConfigToLocalStorage } from '@/services/site-config/site-config-file-service';
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
    const publicUrl = urlParams.get('public_url');
    const publicKey = urlParams.get('public_key');
    
    if (!publicUrl || !publicKey) {
      return { config: null, source: ConfigSource.NONE };
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
    
    const staticConfig = await fetchStaticSiteConfig();
    
    if (!staticConfig) {
      return { config: null, source: ConfigSource.STATIC_FILE };
    }
    
    logger.info('Successfully loaded static site config file', {
      module: 'config-loader',
      host: staticConfig.siteHost
    });
    
    return {
      config: {
        url: staticConfig.supabaseUrl,
        anonKey: staticConfig.supabaseAnonKey,
        isInitialized: true,
        savedAt: new Date().toISOString(),
        environment: getEnvironmentId()
      },
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
    
    logger.info('Successfully loaded configuration from localStorage', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: localConfig.supabaseUrl,
        anonKey: localConfig.supabaseAnonKey,
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
    
    logger.info('Successfully loaded configuration from environment variables', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: envConfig.supabaseUrl,
        anonKey: envConfig.supabaseAnonKey,
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
    if (!defaultUrl || !defaultKey) {
      logger.warn('No default credentials available for database bootstrap', {
        module: 'config-loader'
      });
      return { config: null, source: ConfigSource.DATABASE };
    }
    
    logger.info('Attempting to bootstrap from database', {
      module: 'config-loader'
    });
    
    const bootstrapConfig = await fetchBootstrapConfig(defaultUrl, defaultKey);
    
    if (!bootstrapConfig) {
      return { config: null, source: ConfigSource.DATABASE };
    }
    
    logger.info('Successfully bootstrapped from database', {
      module: 'config-loader'
    });
    
    return {
      config: {
        url: bootstrapConfig.url,
        anonKey: bootstrapConfig.anonKey,
        serviceKey: bootstrapConfig.serviceKey,
        isInitialized: bootstrapConfig.isInitialized || true,
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
    
    if (!defaultUrl || !defaultKey) {
      return { config: null, source: ConfigSource.DEFAULT };
    }
    
    return {
      config: {
        url: defaultUrl,
        anonKey: defaultKey,
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
    writeConfigToLocalStorage(urlConfig.config);
    return urlConfig;
  }
  
  // 2. Try static site config file
  const staticConfig = await loadFromStaticFile();
  if (staticConfig.config) {
    // Save to localStorage for future use
    writeConfigToLocalStorage(staticConfig.config);
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
    writeConfigToLocalStorage(envConfig.config);
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
      writeConfigToLocalStorage(dbConfig.config);
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
    // Always save to localStorage
    const localSaved = writeConfigToLocalStorage(config);
    
    if (!localSaved) {
      logger.warn('Failed to save configuration to localStorage', {
        module: 'config-loader'
      });
    }
    
    // Could add other storage mechanisms here
    
    return localSaved;
  } catch (error) {
    logger.error('Error saving configuration', error, {
      module: 'config-loader'
    });
    return false;
  }
}
