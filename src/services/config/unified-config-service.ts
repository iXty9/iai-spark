
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';
import { testSupabaseConnection } from '@/services/supabase/simplified-connection-service';

export interface ConfigSource {
  name: string;
  priority: number;
  loader: () => Promise<SupabaseConfig | null>;
}

export interface ConfigResult {
  success: boolean;
  config?: SupabaseConfig;
  source?: string;
  error?: string;
}

/**
 * Unified configuration service that consolidates all config loading logic
 * Simple, predictable, and easy to debug
 */
export class UnifiedConfigService {
  private static instance: UnifiedConfigService | null = null;
  private cachedConfig: SupabaseConfig | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UnifiedConfigService {
    if (!this.instance) {
      this.instance = new UnifiedConfigService();
    }
    return this.instance;
  }

  /**
   * Load configuration with clear priority order and caching
   */
  async loadConfig(): Promise<ConfigResult> {
    // Return cached config if still valid
    if (this.cachedConfig && (Date.now() - this.lastLoadTime) < this.CACHE_TTL) {
      logger.info('Using cached config', { module: 'unified-config' });
      return {
        success: true,
        config: this.cachedConfig,
        source: 'cache'
      };
    }

    const sources: ConfigSource[] = [
      { name: 'url-parameters', priority: 1, loader: () => this.loadFromUrlParameters() },
      { name: 'local-storage', priority: 2, loader: () => this.loadFromLocalStorage() },
      { name: 'static-file', priority: 3, loader: () => this.loadFromStaticFile() }
    ];

    // Try each source in priority order
    for (const source of sources.sort((a, b) => a.priority - b.priority)) {
      try {
        logger.info(`Trying config source: ${source.name}`, { module: 'unified-config' });
        
        const config = await source.loader();
        if (config) {
          // Test the configuration
          const isValid = await this.validateConfig(config);
          if (isValid) {
            // Cache the successful config
            this.cachedConfig = config;
            this.lastLoadTime = Date.now();
            
            // Save to localStorage for future use (if not from localStorage)
            if (source.name !== 'local-storage') {
              this.saveToLocalStorage(config);
            }
            
            logger.info(`Config loaded successfully from ${source.name}`, { 
              module: 'unified-config',
              url: config.url.split('//')[1] // Log domain only for security
            });
            
            return {
              success: true,
              config,
              source: source.name
            };
          } else {
            logger.warn(`Config from ${source.name} failed validation`, { module: 'unified-config' });
          }
        }
      } catch (error) {
        logger.error(`Error loading from ${source.name}`, error, { module: 'unified-config' });
      }
    }

    return {
      success: false,
      error: 'No valid configuration found from any source'
    };
  }

  /**
   * Load configuration from URL parameters
   */
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

  /**
   * Load configuration from localStorage
   */
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
      logger.error('Error loading from localStorage', error, { module: 'unified-config' });
    }
    
    return null;
  }

  /**
   * Load configuration from static file
   */
  private async loadFromStaticFile(): Promise<SupabaseConfig | null> {
    try {
      const response = await fetch('/site-config.json', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        return this.createConfig(data.supabaseUrl, data.supabaseAnonKey);
      }
    } catch (error) {
      logger.error('Error loading from static file', error, { module: 'unified-config' });
    }
    
    return null;
  }

  /**
   * Validate configuration by testing connection
   */
  private async validateConfig(config: SupabaseConfig): Promise<boolean> {
    if (!config.url || !config.anonKey) {
      return false;
    }

    try {
      new URL(config.url); // Validate URL format
    } catch {
      return false;
    }

    try {
      const connectionTest = await testSupabaseConnection(config.url, config.anonKey);
      return connectionTest.isConnected;
    } catch (error) {
      logger.error('Connection test failed', error, { module: 'unified-config' });
      return false;
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveToLocalStorage(config: SupabaseConfig): void {
    try {
      const configKey = `spark_supabase_config_${getEnvironmentId()}`;
      const configWithMeta = {
        ...config,
        savedAt: new Date().toISOString(),
        environment: window.location.hostname
      };
      
      localStorage.setItem(configKey, JSON.stringify(configWithMeta));
      logger.info('Config saved to localStorage', { module: 'unified-config' });
    } catch (error) {
      logger.error('Error saving to localStorage', error, { module: 'unified-config' });
    }
  }

  /**
   * Create a standardized config object
   */
  private createConfig(url: string, anonKey: string): SupabaseConfig {
    return {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isInitialized: true,
      savedAt: new Date().toISOString(),
      environment: window.location.hostname
    };
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastLoadTime = 0;
    logger.info('Config cache cleared', { module: 'unified-config' });
  }

  /**
   * Clear localStorage configuration
   */
  clearLocalStorage(): void {
    try {
      const configKey = `spark_supabase_config_${getEnvironmentId()}`;
      localStorage.removeItem(configKey);
      logger.info('localStorage config cleared', { module: 'unified-config' });
    } catch (error) {
      logger.error('Error clearing localStorage', error, { module: 'unified-config' });
    }
  }

  /**
   * Save a new configuration
   */
  saveConfig(config: SupabaseConfig): boolean {
    try {
      this.cachedConfig = config;
      this.lastLoadTime = Date.now();
      this.saveToLocalStorage(config);
      return true;
    } catch (error) {
      logger.error('Error saving config', error, { module: 'unified-config' });
      return false;
    }
  }
}

// Export singleton instance
export const unifiedConfig = UnifiedConfigService.getInstance();
