
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
export function writeConfigToLocalStorage(config: SiteConfig): void {
  try {
    localStorage.setItem('site-config', JSON.stringify(config));
    logger.info('Saved site configuration to localStorage', {
      module: 'site-config'
    });
  } catch (error) {
    logger.error('Failed to write site config to localStorage', error, {
      module: 'site-config'
    });
  }
}
