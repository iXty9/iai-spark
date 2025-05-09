
import { logger } from '@/utils/logging';

/**
 * SiteConfig interface
 */
export interface SiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteHost: string;
  lastUpdated: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Fetch site configuration from static JSON file
 */
export async function fetchStaticSiteConfig(): Promise<SiteConfig | null> {
  try {
    const response = await fetch('/site-config.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch site config: ${response.status}`);
    }

    const config = await response.json();
    
    // Validate that we have required fields
    if (!config || typeof config !== 'object') {
      logger.warn('Site config is not a valid object', {
        module: 'site-config',
        config
      });
      return null;
    }

    return config;
  } catch (error) {
    logger.error('Error fetching site config', error instanceof Error ? error : String(error), {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Generate a template configuration object with default values
 */
export function generateTemplateConfig(): SiteConfig {
  return {
    supabaseUrl: '',
    supabaseAnonKey: '',
    siteHost: window.location.hostname,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Write config to localStorage as a fallback
 */
export function writeConfigToLocalStorage(config: SiteConfig): boolean {
  try {
    localStorage.setItem('site-config', JSON.stringify(config));
    logger.info('Saved site configuration to localStorage', {
      module: 'site-config'
    });
    return true;
  } catch (error) {
    logger.error('Failed to write site config to localStorage', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Read config from localStorage
 */
export function readConfigFromLocalStorage(): SiteConfig | null {
  try {
    const storedConfig = localStorage.getItem('site-config');
    if (!storedConfig) {
      return null;
    }
    
    const config = JSON.parse(storedConfig);
    
    // Validate basic structure
    if (!config || typeof config !== 'object') {
      logger.warn('Stored config is not a valid object', {
        module: 'site-config'
      });
      return null;
    }
    
    return config;
  } catch (error) {
    logger.error('Failed to read site config from localStorage', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Clear config from localStorage
 */
export function clearLocalStorageConfig(): boolean {
  try {
    localStorage.removeItem('site-config');
    logger.info('Cleared site configuration from localStorage', {
      module: 'site-config'
    });
    return true;
  } catch (error) {
    logger.error('Failed to clear site config from localStorage', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Get config from environment variables
 */
export function getConfigFromEnvironment(): SiteConfig | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const siteHost = import.meta.env.VITE_SITE_HOST || window.location.hostname;
    
    // Check if required values are present
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    
    return {
      supabaseUrl,
      supabaseAnonKey,
      siteHost,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to read config from environment', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Update static site config file
 * This requires a server-side API endpoint to save the file
 */
export async function updateStaticSiteConfig(config: SiteConfig): Promise<boolean> {
  try {
    // First, save to localStorage as a fallback
    writeConfigToLocalStorage(config);
    
    // For development environments, we can use a special endpoint
    // that's available in the development server
    const isDev = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
    
    const endpoint = isDev 
      ? '/api/dev/update-site-config' 
      : '/api/update-site-config';
    
    logger.info('Attempting to update site-config.json', {
      module: 'site-config',
      endpoint,
      isDev
    });
    
    // Try to update via API endpoint
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        logger.info('Successfully updated static site config via API', {
          module: 'site-config'
        });
        return true;
      } else {
        throw new Error(result.error || 'Server reported failure');
      }
    } catch (apiError) {
      // If API fails, try fallback method for development
      if (isDev) {
        logger.warn('API update failed, trying fallback method for development', {
          module: 'site-config',
          error: apiError instanceof Error ? apiError.message : String(apiError)
        });
        
        // In development, we can use localStorage and console to help developers
        console.warn('Could not update site-config.json via API. For development, here is the config to manually update:');
        console.log(JSON.stringify(config, null, 2));
        
        // Show instructions in console
        console.info('To manually update site-config.json:');
        console.info('1. Copy the JSON above');
        console.info('2. Replace the contents of public/site-config.json');
        console.info('3. Restart your development server');
        
        return true; // Return true for development to allow flow to continue
      }
      
      // For production, log the error and return false
      logger.error('Failed to update static site config via API', {
        module: 'site-config',
        error: apiError instanceof Error ? apiError.message : String(apiError)
      });
      
      return false;
    }
  } catch (error) {
    logger.error('Error updating static site config', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Create a site config object from Supabase connection details
 */
export function createSiteConfig(url: string, anonKey: string): SiteConfig {
  return {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    siteHost: window.location.origin,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Convert SiteConfig to compatible format for other configuration systems
 */
export function convertSiteConfigToSupabaseConfig(siteConfig: SiteConfig) {
  return {
    url: siteConfig.supabaseUrl,
    anonKey: siteConfig.supabaseAnonKey,
    isInitialized: true,
    savedAt: siteConfig.lastUpdated,
    environment: window.location.hostname
  };
}

/**
 * Convert SupabaseConfig to SiteConfig format
 */
export function convertSupabaseConfigToSiteConfig(config: any): SiteConfig {
  return {
    supabaseUrl: config.url || '',
    supabaseAnonKey: config.anonKey || '',
    siteHost: window.location.hostname,
    lastUpdated: config.savedAt || new Date().toISOString()
  };
}
