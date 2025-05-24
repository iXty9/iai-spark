
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { unifiedConfig, ConfigResult } from '@/services/config/unified-config-service';
import { configState, ConfigStatus } from '@/services/config/config-state-manager';

export interface BootstrapResult {
  success: boolean;
  config?: SupabaseConfig;
  error?: string;
  source?: string;
}

/**
 * Simplified bootstrap service using unified configuration
 */
export class SimpleBootstrap {
  private isBootstrapping = false;
  
  /**
   * Main bootstrap method
   */
  async bootstrap(): Promise<BootstrapResult> {
    if (this.isBootstrapping) {
      return { success: false, error: 'Bootstrap already in progress' };
    }

    this.isBootstrapping = true;
    configState.setLoading();
    
    try {
      logger.info('Starting bootstrap process', { module: 'simple-bootstrap' });
      
      const result: ConfigResult = await unifiedConfig.loadConfig();
      
      if (result.success && result.config) {
        configState.setReady(result.config, result.source || 'unknown');
        
        logger.info('Bootstrap completed successfully', {
          module: 'simple-bootstrap',
          source: result.source
        });
        
        return {
          success: true,
          config: result.config,
          source: result.source
        };
      } else {
        const error = result.error || 'No valid configuration found';
        
        if (error.includes('No valid configuration')) {
          configState.setNeedsSetup();
        } else {
          configState.setError(error);
        }
        
        logger.warn('Bootstrap failed', {
          module: 'simple-bootstrap',
          error
        });
        
        return {
          success: false,
          error
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      configState.setError(errorMessage);
      
      logger.error('Bootstrap error', error, { module: 'simple-bootstrap' });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Save configuration
   */
  saveConfig(config: SupabaseConfig): boolean {
    try {
      const success = unifiedConfig.saveConfig(config);
      if (success) {
        configState.setReady(config, 'manual');
      }
      return success;
    } catch (error) {
      logger.error('Error saving config', error, { module: 'simple-bootstrap' });
      return false;
    }
  }

  /**
   * Clear configuration and reset
   */
  reset(): void {
    try {
      unifiedConfig.clearCache();
      unifiedConfig.clearLocalStorage();
      configState.reset();
      logger.info('Bootstrap reset completed', { module: 'simple-bootstrap' });
    } catch (error) {
      logger.error('Bootstrap reset failed', error, { module: 'simple-bootstrap' });
    }
  }
}

// Export singleton instance
export const simpleBootstrap = new SimpleBootstrap();
