
import { logger } from '@/utils/logging';
import { getStoredConfig, saveConfig, clearConfig } from '@/config/supabase-config';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { testSupabaseConnection } from './connection-service';
import { SupabaseConfig } from '@/config/supabase/types';

export interface BootstrapResult {
  success: boolean;
  config?: SupabaseConfig;
  error?: string;
  source?: string;
}

/**
 * Simplified bootstrap service with clear priorities and minimal complexity
 */
export class SimpleBootstrap {
  private isBootstrapping = false;
  
  /**
   * Main bootstrap method - tries each source in priority order
   */
  async bootstrap(): Promise<BootstrapResult> {
    if (this.isBootstrapping) {
      return { success: false, error: 'Bootstrap already in progress' };
    }

    this.isBootstrapping = true;
    
    try {
      // Check URL parameters first (highest priority)
      const urlResult = this.checkUrlParameters();
      if (urlResult.success) {
        return await this.validateAndSave(urlResult.config!, 'URL parameters');
      }

      // Check stored config second
      const storedResult = this.checkStoredConfig();
      if (storedResult.success) {
        return await this.validateAndSave(storedResult.config!, 'stored config');
      }

      // Check static site config last
      const staticResult = await this.checkStaticConfig();
      if (staticResult.success) {
        return await this.validateAndSave(staticResult.config!, 'static config');
      }

      // No config found anywhere
      return { success: false, error: 'No valid configuration found', source: 'none' };
      
    } catch (error) {
      logger.error('Bootstrap failed with error', error, { module: 'simple-bootstrap' });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        source: 'error'
      };
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Check URL parameters for configuration
   */
  private checkUrlParameters(): BootstrapResult {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Handle reset/force parameters
      if (urlParams.get('reset_config') === 'true') {
        clearConfig();
        return { success: false, error: 'Config reset requested' };
      }
      
      if (urlParams.get('force_init') === 'true') {
        return { success: false, error: 'Force init requested' };
      }

      // Look for config in URL
      const url = urlParams.get('supabase_url') || urlParams.get('public_url');
      const anonKey = urlParams.get('supabase_key') || urlParams.get('anon_key') || urlParams.get('public_key');

      if (url && anonKey) {
        logger.info('Found config in URL parameters', { module: 'simple-bootstrap' });
        return {
          success: true,
          config: {
            url: url.trim(),
            anonKey: anonKey.trim(),
            isInitialized: true,
            savedAt: new Date().toISOString(),
            environment: window.location.hostname
          }
        };
      }

      return { success: false, error: 'No config in URL parameters' };
    } catch (error) {
      return { success: false, error: `URL parameter error: ${error}` };
    }
  }

  /**
   * Check stored configuration
   */
  private checkStoredConfig(): BootstrapResult {
    try {
      const config = getStoredConfig();
      
      if (config && config.url && config.anonKey) {
        logger.info('Found stored config', { module: 'simple-bootstrap' });
        return { success: true, config };
      }

      return { success: false, error: 'No stored config' };
    } catch (error) {
      return { success: false, error: `Stored config error: ${error}` };
    }
  }

  /**
   * Check static site configuration file
   */
  private async checkStaticConfig(): Promise<BootstrapResult> {
    try {
      const staticConfig = await fetchStaticSiteConfig();
      
      if (staticConfig?.supabaseUrl && staticConfig?.supabaseAnonKey) {
        logger.info('Found static config', { module: 'simple-bootstrap' });
        return {
          success: true,
          config: {
            url: staticConfig.supabaseUrl.trim(),
            anonKey: staticConfig.supabaseAnonKey.trim(),
            isInitialized: true,
            savedAt: staticConfig.lastUpdated || new Date().toISOString(),
            environment: window.location.hostname
          }
        };
      }

      return { success: false, error: 'No static config' };
    } catch (error) {
      return { success: false, error: `Static config error: ${error}` };
    }
  }

  /**
   * Validate configuration and save if valid
   */
  private async validateAndSave(config: SupabaseConfig, source: string): Promise<BootstrapResult> {
    try {
      // Basic validation
      if (!config.url?.trim() || !config.anonKey?.trim()) {
        return { success: false, error: 'Invalid config: empty values', source };
      }

      // URL format validation
      try {
        new URL(config.url);
      } catch {
        return { success: false, error: 'Invalid URL format', source };
      }

      // Test connection
      const connectionTest = await testSupabaseConnection(config.url, config.anonKey);
      if (!connectionTest.isConnected) {
        return { 
          success: false, 
          error: `Connection test failed: ${connectionTest.error}`, 
          source 
        };
      }

      // Save valid config
      saveConfig(config);
      
      logger.info(`Bootstrap successful from ${source}`, { 
        module: 'simple-bootstrap',
        url: config.url.split('//')[1] // Log domain only for security
      });

      return { success: true, config, source };
      
    } catch (error) {
      return { 
        success: false, 
        error: `Validation error: ${error}`, 
        source 
      };
    }
  }

  /**
   * Clear all configuration and reset
   */
  reset(): void {
    try {
      clearConfig();
      logger.info('Bootstrap reset completed', { module: 'simple-bootstrap' });
    } catch (error) {
      logger.error('Bootstrap reset failed', error, { module: 'simple-bootstrap' });
    }
  }
}

// Export singleton instance
export const simpleBootstrap = new SimpleBootstrap();
