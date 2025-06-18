
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configManager, AppConfig } from './ConfigurationManager';
import { logger } from '@/utils/logging';

/**
 * Simplified connection service using the unified configuration manager
 */
class ConnectionService {
  private client: SupabaseClient | null = null;
  private currentConfig: AppConfig | null = null;

  /**
   * Initialize Supabase client with current configuration
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      const configResult = await configManager.loadConfiguration();
      
      if (!configResult.success || !configResult.config) {
        return {
          success: false,
          error: configResult.error || 'No configuration available'
        };
      }

      // Test connection before creating client
      const connectionTest = await configManager.testConnection(
        configResult.config.supabaseUrl,
        configResult.config.supabaseAnonKey
      );

      if (!connectionTest.success) {
        return {
          success: false,
          error: connectionTest.error
        };
      }

      // Create client
      this.client = createClient(
        configResult.config.supabaseUrl,
        configResult.config.supabaseAnonKey
      );

      this.currentConfig = configResult.config;

      logger.info('Supabase client initialized successfully', {
        module: 'connection-service',
        source: configResult.source
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize connection', error, { module: 'connection-service' });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get the current Supabase client
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): AppConfig | null {
    return this.currentConfig;
  }

  /**
   * Reset connection (clears client and config)
   */
  reset(): void {
    this.client = null;
    this.currentConfig = null;
    configManager.clearConfiguration();
    logger.info('Connection service reset', { module: 'connection-service' });
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.client !== null && this.currentConfig !== null;
  }

  /**
   * Reinitialize with new configuration
   */
  async reinitialize(config: Partial<AppConfig>): Promise<{ success: boolean; error?: string }> {
    const saveResult = configManager.saveConfiguration(config);
    
    if (!saveResult.success) {
      return saveResult;
    }

    return this.initialize();
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();
