
import { logger } from '@/utils/logging';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';

/**
 * Path to the static site configuration file
 * This file will be accessible without authentication
 */
const SITE_CONFIG_FILE_PATH = '/site-config.json';

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
        statusText: response.statusText
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
      localStorage.setItem('site-config', JSON.stringify(staticConfig));
      
      logger.info('Static site configuration saved to localStorage', {
        module: 'site-config',
        host: staticConfig.siteHost
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
    
    const configJson = localStorage.getItem('site-config');
    
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
