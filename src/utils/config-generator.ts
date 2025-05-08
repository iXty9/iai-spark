import { logger } from '@/utils/logging';
import { generateTemplateConfig, writeConfigToLocalStorage } from '@/services/site-config/site-config-file-service';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';

/**
 * Generate a configuration file with the provided values
 * This can be used during development or initial setup
 */
export async function generateConfigFile(
  supabaseUrl: string,
  supabaseAnonKey: string,
  outputPath?: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Cannot generate config with empty values', {
        module: 'config-generator'
      });
      return false;
    }
    
    const config = {
      ...generateTemplateConfig(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage as a fallback
    const siteConfig: SiteConfigEnv = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      siteHost: config.siteHost,
      lastUpdated: config.lastUpdated
    };
    
    writeConfigToLocalStorage(siteConfig);
    
    // In a browser environment, we can't write to the filesystem directly
    // So we'll create a downloadable file
    if (typeof window !== 'undefined' && !outputPath) {
      const jsonContent = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'site-config.json';
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      logger.info('Configuration file generated and downloaded', {
        module: 'config-generator'
      });
      
      return true;
    }
    
    // For Node.js environments or when outputPath is provided
    // This would be used in build scripts or server-side code
    if (outputPath && typeof process !== 'undefined') {
      // This would require the fs module in Node.js
      // Since this is a browser application, we'll just log a message
      logger.info('Would write configuration to file (server-side)', {
        module: 'config-generator',
        outputPath,
        config
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Error generating configuration file', {
      module: 'config-generator',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Check if the current environment has valid configuration
 */
export function hasValidConfiguration(): boolean {
  try {
    // Check environment variables
    const hasEnvVars = !!(
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Check localStorage
    let hasLocalStorage = false;
    if (typeof localStorage !== 'undefined') {
      const config = localStorage.getItem('site-config');
      if (config) {
        try {
          const parsed = JSON.parse(config);
          hasLocalStorage = !!(parsed.supabaseUrl && parsed.supabaseAnonKey);
        } catch (e) {
          // Invalid JSON
        }
      }
    }
    
    return hasEnvVars || hasLocalStorage;
  } catch (error) {
    logger.error('Error checking configuration', {
      module: 'config-generator',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
