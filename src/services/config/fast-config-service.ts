
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

export interface FastConfigResult {
  success: boolean;
  config?: SupabaseConfig;
  error?: string;
}

/**
 * Ultra-fast config service that ONLY loads from site-config.json
 * No caching, no validation, no complexity - just direct loading
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
   * Direct load from site-config.json with no caching
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

      // Quick validation - if missing required fields, it's invalid
      if (!data.supabaseUrl || !data.supabaseAnonKey) {
        logger.warn('Invalid site-config.json - missing required fields', { module: 'fast-config' });
        return {
          success: false,
          error: 'Invalid configuration - missing Supabase credentials'
        };
      }

      const config: SupabaseConfig = {
        url: data.supabaseUrl.trim(),
        anonKey: data.supabaseAnonKey.trim(),
        isInitialized: true,
        savedAt: new Date().toISOString(),
        environment: window.location.hostname
      };

      logger.info('Config loaded successfully', { module: 'fast-config' });
      
      return {
        success: true,
        config
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
