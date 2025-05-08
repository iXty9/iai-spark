
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
    // This function would typically call a server API endpoint
    // that would save the config to a file on the server
    // For client-side only applications, we can't directly write to files
    
    // Example implementation using an API endpoint
    const response = await fetch('/api/update-site-config.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      logger.error('Failed to update static site config', {
        module: 'site-config',
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }
    
    const result = await response.json();
    
    if (result.success) {
      logger.info('Successfully updated static site config', {
        module: 'site-config'
      });
      return true;
    } else {
      logger.warn('Server reported failure updating static site config', {
        module: 'site-config',
        error: result.error
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
