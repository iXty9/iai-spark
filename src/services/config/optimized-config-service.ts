
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';

export interface ConfigResult {
  success: boolean;
  config?: SupabaseConfig;
  source?: string;
  error?: string;
}

/**
 * Optimized configuration service with aggressive caching and parallel loading
 */
export class OptimizedConfigService {
  private static instance: OptimizedConfigService | null = null;
  private cachedConfig: SupabaseConfig | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private loadingPromise: Promise<ConfigResult> | null = null;

  static getInstance(): OptimizedConfigService {
    if (!this.instance) {
      this.instance = new OptimizedConfigService();
    }
    return this.instance;
  }

  /**
   * Optimized config loading with deduplication and parallel processing
   */
  async loadConfig(): Promise<ConfigResult> {
    // Return cached config if still valid
    if (this.cachedConfig && (Date.now() - this.lastLoadTime) < this.CACHE_TTL) {
      logger.info('Using cached config', { module: 'optimized-config' });
      return {
        success: true,
        config: this.cachedConfig,
        source: 'cache'
      };
    }

    // Deduplicate concurrent requests
    if (this.loadingPromise) {
      logger.info('Deduplicating concurrent config load', { module: 'optimized-config' });
      return this.loadingPromise;
    }

    // Start new loading process
    this.loadingPromise = this.performOptimizedLoad();
    
    try {
      const result = await this.loadingPromise;
      return result;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async performOptimizedLoad(): Promise<ConfigResult> {
    logger.info('Starting optimized config load', { module: 'optimized-config' });

    // Load all sources in parallel without validation delays
    const sourcePromises = [
      this.loadFromUrlParameters(),
      this.loadFromLocalStorage(),
      this.loadFromStaticFile()
    ];

    const results = await Promise.allSettled(sourcePromises);
    
    // Check results in priority order
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const config = result.value;
        
        // Cache immediately without validation (validate in background)
        this.cachedConfig = config;
        this.lastLoadTime = Date.now();
        this.saveToLocalStorage(config);
        
        const source = ['url-parameters', 'local-storage', 'static-file'][i];
        logger.info(`Config loaded from ${source}`, { module: 'optimized-config' });
        
        // Background validation (non-blocking)
        this.validateConfigInBackground(config);
        
        return {
          success: true,
          config,
          source
        };
      }
    }

    return {
      success: false,
      error: 'No valid configuration found from any source'
    };
  }

  private async validateConfigInBackground(config: SupabaseConfig): Promise<void> {
    try {
      // Validate in background without blocking
      const { testSupabaseConnection } = await import('@/services/supabase/simplified-connection-service');
      const isValid = await testSupabaseConnection(config.url, config.anonKey);
      
      if (!isValid.isConnected) {
        logger.warn('Background validation failed', { 
          module: 'optimized-config',
          error: isValid.error 
        });
      }
    } catch (error) {
      logger.warn('Background validation error', error, { module: 'optimized-config' });
    }
  }

  private async loadFromUrlParameters(): Promise<SupabaseConfig | null> {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle special parameters
    if (urlParams.get('reset_config') === 'true') {
      this.clearCache();
      this.clearLocalStorage();
      return null;
    }
    
    if (urlParams.get('force_init') === 'true') {
      return null;
    }

    const url = urlParams.get('supabase_url') || urlParams.get('public_url');
    const anonKey = urlParams.get('supabase_key') || urlParams.get('anon_key') || urlParams.get('public_key');

    if (url && anonKey) {
      return this.createConfig(url.trim(), anonKey.trim());
    }

    return null;
  }

  private async loadFromLocalStorage(): Promise<SupabaseConfig | null> {
    try {
      const configKey = `spark_supabase_config_${getEnvironmentId()}`;
      const stored = localStorage.getItem(configKey);
      
      if (stored) {
        const config = JSON.parse(stored) as SupabaseConfig;
        if (config.url && config.anonKey) {
          return config;
        }
      }
    } catch (error) {
      logger.error('Error loading from localStorage', error, { module: 'optimized-config' });
    }
    
    return null;
  }

  private async loadFromStaticFile(): Promise<SupabaseConfig | null> {
    try {
      // Use aggressive caching with fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/site-config.json', { 
        cache: 'force-cache', // Use cache aggressively
        signal: controller.signal,
        headers: { 'Cache-Control': 'max-age=3600' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        return this.createConfig(data.supabaseUrl, data.supabaseAnonKey);
      }
    } catch (error) {
      logger.error('Error loading from static file', error, { module: 'optimized-config' });
    }
    
    return null;
  }

  private saveToLocalStorage(config: SupabaseConfig): void {
    try {
      const configKey = `spark_supabase_config_${getEnvironmentId()}`;
      const configWithMeta = {
        ...config,
        savedAt: new Date().toISOString(),
        environment: window.location.hostname
      };
      
      localStorage.setItem(configKey, JSON.stringify(configWithMeta));
    } catch (error) {
      logger.error('Error saving to localStorage', error, { module: 'optimized-config' });
    }
  }

  private createConfig(url: string, anonKey: string): SupabaseConfig {
    return {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isInitialized: true,
      savedAt: new Date().toISOString(),
      environment: window.location.hostname
    };
  }

  clearCache(): void {
    this.cachedConfig = null;
    this.lastLoadTime = 0;
    this.loadingPromise = null;
    logger.info('Config cache cleared', { module: 'optimized-config' });
  }

  clearLocalStorage(): void {
    try {
      const configKey = `spark_supabase_config_${getEnvironmentId()}`;
      localStorage.removeItem(configKey);
      logger.info('localStorage config cleared', { module: 'optimized-config' });
    } catch (error) {
      logger.error('Error clearing localStorage', error, { module: 'optimized-config' });
    }
  }

  saveConfig(config: SupabaseConfig): boolean {
    try {
      this.cachedConfig = config;
      this.lastLoadTime = Date.now();
      this.saveToLocalStorage(config);
      return true;
    } catch (error) {
      logger.error('Error saving config', error, { module: 'optimized-config' });
      return false;
    }
  }
}

// Export singleton instance
export const optimizedConfig = OptimizedConfigService.getInstance();
