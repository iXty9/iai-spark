
import { connectionService } from './connection-service';
import { configManager } from './ConfigurationManager';
import { logger } from '@/utils/logging';

export interface InitializationResult {
  isComplete: boolean;
  needsConfiguration: boolean;
  error?: string;
}

/**
 * Simplified initialization service
 * Replaces the complex coordinated-init-service with a simple 3-step process
 */
class InitializationService {
  private isInitialized = false;

  /**
   * Initialize the application
   * Simple process: Load Config → Connect → Mark Ready
   */
  async initialize(): Promise<InitializationResult> {
    try {
      logger.info('Starting application initialization', { module: 'init-service' });

      // Step 1: Load configuration
      const configResult = await configManager.loadConfiguration();
      
      if (!configResult.success) {
        logger.info('No configuration found, needs setup', { module: 'init-service' });
        return {
          isComplete: false,
          needsConfiguration: true,
          error: configResult.error
        };
      }

      // Step 2: Initialize connection
      const connectionResult = await connectionService.initialize();
      
      if (!connectionResult.success) {
        logger.error('Connection failed during initialization', { module: 'init-service' });
        return {
          isComplete: false,
          needsConfiguration: true,
          error: connectionResult.error
        };
      }

      // Step 3: Mark as initialized
      this.isInitialized = true;
      logger.info('Application initialization completed successfully', { module: 'init-service' });

      return {
        isComplete: true,
        needsConfiguration: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Initialization failed', error, { module: 'init-service' });
      
      return {
        isComplete: false,
        needsConfiguration: true,
        error: errorMessage
      };
    }
  }

  /**
   * Check if application is initialized
   */
  isReady(): boolean {
    return this.isInitialized && connectionService.isReady();
  }

  /**
   * Reset initialization state
   */
  reset(): void {
    this.isInitialized = false;
    connectionService.reset();
    logger.info('Initialization service reset', { module: 'init-service' });
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    isInitialized: boolean;
    hasConfiguration: boolean;
    hasConnection: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      hasConfiguration: configManager.hasConfiguration(),
      hasConnection: connectionService.isReady()
    };
  }
}

// Export singleton instance
export const initializationService = new InitializationService();
