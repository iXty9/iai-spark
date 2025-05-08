
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
 * Generate a template configuration with default empty values
 * This is useful when creating a new site-config.json file
 */
export function generateTemplateConfig(): StaticSiteConfig {
  return {
    supabaseUrl: '',
    supabaseAnonKey: '',
    siteHost: window.location.hostname,
    lastUpdated: new Date().toISOString()
  };
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
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Attempt to fetch the config file with cache busting
      const timestamp = new Date().getTime();
      const response = await fetch(`${configUrl}?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        logger.warn('No static site configuration found', {
          module: 'site-config',
          status: response.status,
          statusText: response.statusText,
          message: 'This is expected for new installations. Create a site-config.json file based on the example template.'
        });
        return null;
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Site config response is not JSON', {
          module: 'site-config',
          contentType
        });
      }
      
      const responseText = await response.text();
      
      // Log the raw response for debugging
      logger.debug('Raw site config response', {
        module: 'site-config',
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 50) + '...'
      });
      
      // Check if the response is empty or just whitespace
      if (!responseText.trim()) {
        logger.warn('Static site config file is empty', {
          module: 'site-config'
        });
        return null;
      }
      
      let config: StaticSiteConfig;
      
      try {
        config = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse static site configuration JSON', {
          module: 'site-config',
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText: responseText.substring(0, 100) + '...'
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
          hasUrl: !!config.supabaseUrl,
          hasAnonKey: !!config.supabaseAnonKey
        });
        return null;
      }
      
      logger.info('Successfully parsed static site configuration', {
        module: 'site-config',
        host: config.siteHost || window.location.hostname,
        lastUpdated: config.lastUpdated || 'not set'
      });
      
      // Convert to the expected format
      return {
        supabaseUrl: config.supabaseUrl.trim(),
        supabaseAnonKey: config.supabaseAnonKey.trim(),
        siteHost: (config.siteHost || window.location.hostname).trim(),
        lastUpdated: config.lastUpdated || new Date().toISOString()
      };
    } catch (innerError) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check for timeout
      if (innerError.name === 'AbortError') {
        logger.warn('Static site config fetch timed out', {
          module: 'site-config'
        });
        return null;
      }
      
      logger.error('Error fetching static site configuration', innerError, {
        module: 'site-config'
      });
      return null;
    }
  } catch (error) {
    logger.error('Error in fetchStaticSiteConfig', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Read configuration from localStorage
 */
export function readConfigFromLocalStorage(): SiteConfigEnv | null {
  try {
    const siteConfig = localStorage.getItem(LS_CONFIG_KEY);
    if (!siteConfig) {
      return null;
    }
    
    const config = JSON.parse(siteConfig);
    return config;
  } catch (error) {
    logger.error('Error reading configuration from localStorage', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Clear configuration from localStorage
 */
export function clearLocalStorageConfig(): boolean {
  try {
    localStorage.removeItem(LS_CONFIG_KEY);
    localStorage.removeItem(LS_CONFIG_TIMESTAMP);
    
    logger.info('Cleared configuration from localStorage', {
      module: 'site-config'
    });
    
    return true;
  } catch (error) {
    logger.error('Error clearing configuration from localStorage', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Write configuration to localStorage
 */
export function writeConfigToLocalStorage(config: SiteConfigEnv | any): boolean {
  try {
    if (!config) {
      return false;
    }
    
    // Check for empty values
    if (
      (config.supabaseUrl !== undefined && (!config.supabaseUrl || !config.supabaseUrl.trim())) ||
      (config.supabaseAnonKey !== undefined && (!config.supabaseAnonKey || !config.supabaseAnonKey.trim()))
    ) {
      logger.warn('Attempted to write empty config values to localStorage', {
        module: 'site-config',
        hasUrl: !!config.supabaseUrl,
        hasKey: !!config.supabaseAnonKey
      });
      return false;
    }
    
    // Normalize config format
    const siteConfig: SiteConfigEnv = {
      supabaseUrl: config.url || config.supabaseUrl,
      supabaseAnonKey: config.anonKey || config.supabaseAnonKey,
      siteHost: config.siteHost || window.location.hostname,
      lastUpdated: config.lastUpdated || new Date().toISOString()
    };
    
    localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(siteConfig));
    localStorage.setItem(LS_CONFIG_TIMESTAMP, new Date().toISOString());
    
    logger.info('Wrote configuration to localStorage', {
      module: 'site-config',
      hasUrl: !!siteConfig.supabaseUrl,
      hasKey: !!siteConfig.supabaseAnonKey
    });
    
    return true;
  } catch (error) {
    logger.error('Error writing configuration to localStorage', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Get configuration from environment variables
 * This is useful for development and testing
 */
export function getConfigFromEnvironment(): SiteConfigEnv | null {
  try {
    const supabaseUrl = import.meta.env[ENV_SUPABASE_URL];
    const supabaseAnonKey = import.meta.env[ENV_SUPABASE_ANON_KEY];
    const siteHost = import.meta.env[ENV_SITE_HOST];
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    
    return {
      supabaseUrl,
      supabaseAnonKey,
      siteHost: siteHost || window.location.hostname,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error reading configuration from environment', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Update the static site configuration file
 * This requires server-side permissions and might not work in all environments
 */
export async function updateStaticSiteConfig(config: SiteConfigEnv): Promise<boolean> {
  try {
    // First validate that we have valid config values
    if (!config.supabaseUrl || !config.supabaseUrl.trim() || 
        !config.supabaseAnonKey || !config.supabaseAnonKey.trim()) {
      logger.warn('Cannot update site config with empty values', {
        module: 'site-config',
        hasUrl: !!config.supabaseUrl,
        hasKey: !!config.supabaseAnonKey
      });
      return false;
    }
    
    // For now, this is a client-side application so we can't update the config file
    // We'll return false here, but in a real application with server-side code,
    // we'd update the file here
    logger.warn('Static site config update not implemented', {
      module: 'site-config',
      message: 'This would require server-side code to update the file'
    });
    
    return false;
  } catch (error) {
    logger.error('Error updating static site configuration', error, {
      module: 'site-config'
    });
    return false;
  }
}
