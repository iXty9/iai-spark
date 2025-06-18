
import { z } from 'zod';
import { logger } from '@/utils/logging';

// Unified configuration schema
const ConfigSchema = z.object({
  supabaseUrl: z.string().url('Invalid Supabase URL'),
  supabaseAnonKey: z.string().min(1, 'Supabase anonymous key is required'),
  supabaseServiceKey: z.string().optional(),
  environment: z.string().default('production'),
  lastUpdated: z.string().optional(),
  isInitialized: z.boolean().default(false)
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export interface ConfigLoadResult {
  success: boolean;
  config?: AppConfig;
  error?: string;
  source?: 'environment' | 'static-file' | 'cache' | 'user-input';
}

/**
 * Unified Configuration Manager
 * Replaces all scattered configuration logic with a single, simple manager
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private cache: AppConfig | null = null;
  private readonly CACHE_KEY = 'app-config';

  static getInstance(): ConfigurationManager {
    if (!this.instance) {
      this.instance = new ConfigurationManager();
    }
    return this.instance;
  }

  /**
   * Load configuration from all sources in priority order
   */
  async loadConfiguration(): Promise<ConfigLoadResult> {
    try {
      // 1. Check cache first
      const cachedConfig = this.loadFromCache();
      if (cachedConfig.success) {
        logger.info('Configuration loaded from cache', { module: 'config-manager' });
        return cachedConfig;
      }

      // 2. Try environment variables
      const envConfig = this.loadFromEnvironment();
      if (envConfig.success) {
        this.saveToCache(envConfig.config!);
        logger.info('Configuration loaded from environment', { module: 'config-manager' });
        return envConfig;
      }

      // 3. Try static file
      const staticConfig = await this.loadFromStaticFile();
      if (staticConfig.success) {
        this.saveToCache(staticConfig.config!);
        logger.info('Configuration loaded from static file', { module: 'config-manager' });
        return staticConfig;
      }

      // 4. No configuration found
      logger.warn('No configuration found from any source', { module: 'config-manager' });
      return {
        success: false,
        error: 'No configuration found. Please configure the application.'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load configuration', error, { module: 'config-manager' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Save configuration from user input
   */
  saveConfiguration(config: Partial<AppConfig>): ConfigLoadResult {
    try {
      const validatedConfig = this.validateConfig({
        ...config,
        lastUpdated: new Date().toISOString(),
        isInitialized: true
      });

      if (!validatedConfig.success) {
        return validatedConfig;
      }

      this.saveToCache(validatedConfig.config!);
      this.cache = validatedConfig.config!;

      logger.info('Configuration saved successfully', { module: 'config-manager' });
      return {
        success: true,
        config: validatedConfig.config!,
        source: 'user-input'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save configuration', error, { module: 'config-manager' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Test connection with given credentials
   */
  async testConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): AppConfig | null {
    return this.cache;
  }

  /**
   * Clear all configuration
   */
  clearConfiguration(): void {
    this.cache = null;
    try {
      localStorage.removeItem(this.CACHE_KEY);
      logger.info('Configuration cleared', { module: 'config-manager' });
    } catch (error) {
      logger.warn('Failed to clear localStorage', error, { module: 'config-manager' });
    }
  }

  /**
   * Check if configuration exists
   */
  hasConfiguration(): boolean {
    return this.cache !== null || this.hasValidCache();
  }

  // Private methods

  private validateConfig(config: any): ConfigLoadResult {
    try {
      const validated = ConfigSchema.parse(config);
      return {
        success: true,
        config: validated
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return {
          success: false,
          error: `Validation failed: ${errorMessages.join(', ')}`
        };
      }
      return {
        success: false,
        error: 'Invalid configuration format'
      };
    }
  }

  private loadFromCache(): ConfigLoadResult {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return { success: false, error: 'No cached configuration' };
      }

      const parsed = JSON.parse(cached);
      const validation = this.validateConfig(parsed);
      
      if (validation.success) {
        this.cache = validation.config!;
        return {
          success: true,
          config: validation.config!,
          source: 'cache'
        };
      }

      // Clear invalid cache
      localStorage.removeItem(this.CACHE_KEY);
      return { success: false, error: 'Invalid cached configuration' };

    } catch (error) {
      localStorage.removeItem(this.CACHE_KEY);
      return { success: false, error: 'Failed to load cached configuration' };
    }
  }

  private loadFromEnvironment(): ConfigLoadResult {
    try {
      const env = import.meta.env;
      
      if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        return { success: false, error: 'Environment variables not set' };
      }

      const config = {
        supabaseUrl: env.VITE_SUPABASE_URL,
        supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
        supabaseServiceKey: env.VITE_SUPABASE_SERVICE_KEY,
        environment: env.NODE_ENV || 'production',
        isInitialized: true
      };

      const validation = this.validateConfig(config);
      if (validation.success) {
        this.cache = validation.config!;
      }

      return validation;

    } catch (error) {
      return {
        success: false,
        error: 'Failed to load environment configuration'
      };
    }
  }

  private async loadFromStaticFile(): Promise<ConfigLoadResult> {
    try {
      const response = await fetch('/site-config.json', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Static config file not found: ${response.status}`
        };
      }

      const data = await response.json();
      const config = {
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey,
        environment: data.environment || 'production',
        lastUpdated: data.lastUpdated,
        isInitialized: true
      };

      const validation = this.validateConfig(config);
      if (validation.success) {
        this.cache = validation.config!;
      }

      return validation;

    } catch (error) {
      return {
        success: false,
        error: 'Failed to load static configuration file'
      };
    }
  }

  private saveToCache(config: AppConfig): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(config));
    } catch (error) {
      logger.warn('Failed to save configuration to cache', error, { module: 'config-manager' });
    }
  }

  private hasValidCache(): boolean {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached !== null && JSON.parse(cached).supabaseUrl && JSON.parse(cached).supabaseAnonKey;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();
