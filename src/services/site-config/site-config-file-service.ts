
import { logger } from '@/utils/logging';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';

/**
 * Path to the static site configuration file
 * This file will be accessible without authentication
 * 
 * Note: This file should be added to .gitignore to prevent committing sensitive credentials
 * Use site-config.example.json as a template
 */
const SITE_CONFIG_FILE_PATH = '/site-config.json';
const SITE_CONFIG_EXAMPLE_PATH = '/site-config.example.json';

/**
 * Environment variable names that can be used for configuration
 */
const ENV_SUPABASE_URL = 'VITE_SUPABASE_URL';
const ENV_SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY';
const ENV_SITE_HOST = 'VITE_SITE_HOST';

/**
 * Local storage keys
 */
const LS_CONFIG_KEY = 'site-config';
const LS_CONFIG_TIMESTAMP = 'site-config-timestamp';

/**
 * Format for the static site configuration file
 */
interface StaticSiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastUpdated: string;
  siteHost: string;
}

/**
 * Fetch the static site configuration file
 * This is used to bootstrap the application without requiring localStorage or an existing connection
 */
export async function fetchStaticSiteConfig(): Promise<SiteConfigEnv | null> {
  try {
    const baseUrl = window.location.origin;
    const configUrl = `${baseUrl}${SITE_CONFIG_FILE_PATH}`;
    
    logger.info('Fetching static site configuration', {
      module: 'site-config',
      configUrl
    });
    
    // Attempt to fetch the config file
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      logger.warn('No static site configuration found', {
        module: 'site-config',
        status: response.status,
        statusText: response.statusText,
        message: 'This is expected for new installations. Create a site-config.json file based on the example template.'
      });
      return null;
    }
    
    let config: StaticSiteConfig;
    
    try {
      config = await response.json();
    } catch (parseError) {
      logger.error('Failed to parse static site configuration JSON', {
        module: 'site-config',
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return null;
    }
    
    // Perform thorough validation of the config
    const validationErrors = [];
    
    if (!config) {
      logger.error('Empty static site configuration', {
        module: 'site-config'
      });
      return null;
    }
    
    if (!config.supabaseUrl) {
      validationErrors.push('Missing supabaseUrl');
    } else if (!config.supabaseUrl.trim()) {
      validationErrors.push('Empty supabaseUrl');
    } else if (!config.supabaseUrl.startsWith('http')) {
      validationErrors.push('Invalid supabaseUrl format (must start with http:// or https://)');
    }
    
    if (!config.supabaseAnonKey) {
      validationErrors.push('Missing supabaseAnonKey');
    } else if (!config.supabaseAnonKey.trim()) {
      validationErrors.push('Empty supabaseAnonKey');
    }
    
    if (validationErrors.length > 0) {
      logger.warn('Invalid static site configuration', {
        module: 'site-config',
        errors: validationErrors,
        config
      });
      return null;
    }
    
    // Convert to the expected format
    return {
      supabaseUrl: config.supabaseUrl.trim(),
      supabaseAnonKey: config.supabaseAnonKey.trim(),
      siteHost: (config.siteHost || window.location.hostname).trim(),
      lastUpdated: config.lastUpdated || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching static site configuration', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Endpoint for updating the site configuration file
 * This would typically be called by an API or during build
 */
export async function updateStaticSiteConfig(config: SiteConfigEnv): Promise<boolean> {
  try {
    // Validate input configuration
    if (!config) {
      logger.error('Cannot update with null configuration', {
        module: 'site-config'
      });
      return false;
    }
    
    // Validate required fields
    if (!config.supabaseUrl || !config.supabaseUrl.trim()) {
      logger.error('Cannot update with empty supabaseUrl', {
        module: 'site-config'
      });
      return false;
    }
    
    if (!config.supabaseAnonKey || !config.supabaseAnonKey.trim()) {
      logger.error('Cannot update with empty supabaseAnonKey', {
        module: 'site-config'
      });
      return false;
    }
    
    const staticConfig: StaticSiteConfig = {
      supabaseUrl: config.supabaseUrl.trim(),
      supabaseAnonKey: config.supabaseAnonKey.trim(),
      lastUpdated: new Date().toISOString(),
      siteHost: (config.siteHost || window.location.hostname).trim()
    };
    
    logger.info('Attempting to update static site configuration', {
      module: 'site-config',
      host: staticConfig.siteHost
    });
    
    // For client-side updates, we'll use a simple POST request to a server endpoint
    // In a production environment, this would be a secure API endpoint
    const baseUrl = window.location.origin;
    const updateUrl = `${baseUrl}/api/update-site-config`;
    
    try {
      const response = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(staticConfig)
      });
      
      if (!response.ok) {
        logger.error('Failed to update static site configuration', {
          module: 'site-config',
          status: response.status,
          statusText: response.statusText,
          url: updateUrl
        });
        return false;
      }
      
      logger.info('Static site configuration updated successfully', {
        module: 'site-config'
      });
      
      return true;
    } catch (fetchError) {
      logger.error('Network error updating static site configuration', {
        module: 'site-config',
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        url: updateUrl
      });
      
      // Try fallback to localStorage if API fails
      return writeConfigToLocalStorage(config);
    }
  } catch (error) {
    logger.error('Error updating static site configuration', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Fallback function to write configuration to localStorage
 * This is used as a fallback when the API isn't available
 */
export function writeConfigToLocalStorage(config: SiteConfigEnv): boolean {
  try {
    // Validate input configuration
    if (!config) {
      logger.error('Cannot save null configuration to localStorage', {
        module: 'site-config'
      });
      return false;
    }
    
    // Validate required fields
    if (!config.supabaseUrl || !config.supabaseUrl.trim()) {
      logger.error('Cannot save empty supabaseUrl to localStorage', {
        module: 'site-config'
      });
      return false;
    }
    
    if (!config.supabaseAnonKey || !config.supabaseAnonKey.trim()) {
      logger.error('Cannot save empty supabaseAnonKey to localStorage', {
        module: 'site-config'
      });
      return false;
    }
    
    const staticConfig: StaticSiteConfig = {
      supabaseUrl: config.supabaseUrl.trim(),
      supabaseAnonKey: config.supabaseAnonKey.trim(),
      lastUpdated: new Date().toISOString(),
      siteHost: (config.siteHost || window.location.hostname).trim()
    };
    
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      logger.error('localStorage is not available in this environment', {
        module: 'site-config'
      });
      return false;
    }
    
    try {
      localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(staticConfig));
      localStorage.setItem(LS_CONFIG_TIMESTAMP, new Date().toISOString());
      
      logger.info('Static site configuration saved to localStorage', {
        module: 'site-config',
        host: staticConfig.siteHost,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (storageError) {
      // This can happen if localStorage is full or disabled
      logger.error('Failed to write to localStorage', {
        module: 'site-config',
        error: storageError instanceof Error ? storageError.message : String(storageError)
      });
      return false;
    }
  } catch (error) {
    logger.error('Error saving static site configuration to localStorage', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Try to get configuration from environment variables
 * This is used during development or in environments where env vars are available
 */
export function getConfigFromEnvironment(): SiteConfigEnv | null {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    
    // Access environment variables (these are injected by Vite during build)
    const supabaseUrl = import.meta.env[ENV_SUPABASE_URL] || '';
    const supabaseAnonKey = import.meta.env[ENV_SUPABASE_ANON_KEY] || '';
    const siteHost = import.meta.env[ENV_SITE_HOST] || window.location.hostname;
    
    // Validate the environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      logger.info('No valid configuration found in environment variables', {
        module: 'site-config',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      return null;
    }
    
    logger.info('Using configuration from environment variables', {
      module: 'site-config',
      siteHost
    });
    
    return {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      siteHost: siteHost.trim(),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error reading configuration from environment', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Generate a template configuration file
 * This can be used to create a default site-config.json
 */
export function generateTemplateConfig(): StaticSiteConfig {
  return {
    supabaseUrl: "https://your-project-id.supabase.co",
    supabaseAnonKey: "your-anon-key-here",
    siteHost: window.location.hostname,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Try all available configuration sources in order of preference
 * This is the main entry point for getting configuration
 */
export async function getConfigFromAllSources(): Promise<SiteConfigEnv | null> {
  // Try sources in order of preference
  
  // 1. Try static site config file (fastest and most reliable when available)
  const staticConfig = await fetchStaticSiteConfig();
  if (staticConfig) {
    logger.info('Using configuration from static site config file', {
      module: 'site-config'
    });
    return staticConfig;
  }
  
  // 2. Try environment variables (good for development)
  const envConfig = getConfigFromEnvironment();
  if (envConfig) {
    logger.info('Using configuration from environment variables', {
      module: 'site-config'
    });
    return envConfig;
  }
  
  // 3. Try localStorage (fallback for returning users)
  const localConfig = readConfigFromLocalStorage();
  if (localConfig) {
    logger.info('Using configuration from localStorage', {
      module: 'site-config'
    });
    return localConfig;
  }
  
  // 4. No configuration found
  logger.warn('No configuration found from any source', {
    module: 'site-config'
  });
  return null;
}

/**
 * Read configuration from localStorage
 * This is used as a fallback when the static file isn't available
 */
export function readConfigFromLocalStorage(): SiteConfigEnv | null {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      logger.info('localStorage is not available in this environment', {
        module: 'site-config'
      });
      return null;
    }
    
    const configJson = localStorage.getItem(LS_CONFIG_KEY);
    
    if (!configJson) {
      logger.info('No configuration found in localStorage', {
        module: 'site-config'
      });
      return null;
    }
    
    try {
      const config: StaticSiteConfig = JSON.parse(configJson);
      
      // Validate the parsed config
      if (!config.supabaseUrl || !config.supabaseUrl.trim() || 
          !config.supabaseAnonKey || !config.supabaseAnonKey.trim()) {
        logger.warn('Invalid configuration found in localStorage', {
          module: 'site-config',
          config
        });
        return null;
      }
      
      return {
        supabaseUrl: config.supabaseUrl.trim(),
        supabaseAnonKey: config.supabaseAnonKey.trim(),
        siteHost: (config.siteHost || window.location.hostname).trim(),
        lastUpdated: config.lastUpdated || new Date().toISOString()
      };
    } catch (parseError) {
      logger.error('Failed to parse configuration from localStorage', {
        module: 'site-config',
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return null;
    }
  } catch (error) {
    logger.error('Error reading configuration from localStorage', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
