
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { validateSupabaseConfig } from '@/config/supabase/utils';

export interface FastConfigResult {
  success: boolean;
  config?: SupabaseConfig;
  error?: string;
}

/**
 * Ultra-fast config service that ONLY loads from site-config.json
 * Now uses consolidated validation utilities
 */
export class FastConfigService {
  private static instance: FastConfigService | null = null;

  static getInstance(): FastConfigService {
    if (!this.instance) {
      this.instance = new FastConfigService();
    }
    return this.instance;
  }

  /**
   * Direct load from site-config.json with consolidated validation
   */
  async loadConfig(): Promise<FastConfigResult> {
    try {
      logger.info('Loading config directly from site-config.json', { module: 'fast-config' });

      // Always fetch fresh - no browser cache
      const response = await fetch('/site-config.json', {
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch site-config.json: ${response.status}`);
      }

      const data = await response.json();

      // Use consolidated validation
      const configData = {
        url: data.supabaseUrl,
        anonKey: data.supabaseAnonKey,
        isInitialized: true,
        savedAt: new Date().toISOString(),
        environment: window.location.hostname
      };

      const validationResult = validateSupabaseConfig(configData);
      
      if (!validationResult.valid) {
        logger.warn('Invalid site-config.json', { 
          module: 'fast-config',
          errors: validationResult.errors 
        });
        return {
          success: false,
          error: validationResult.errors?.join(', ') || 'Invalid configuration'
        };
      }

      logger.info('Config loaded successfully', { module: 'fast-config' });
      
      return {
        success: true,
        config: validationResult.config!
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load config', error, { module: 'fast-config' });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const fastConfig = FastConfigService.getInstance();
