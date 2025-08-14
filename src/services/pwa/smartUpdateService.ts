import { versionService } from './versionService';
import { coordinatedInitService } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';

/**
 * Smart update service that coordinates theme initialization with PWA updates
 * Ensures theme is ready before any version checks can interfere
 */
class SmartUpdateService {
  private static instance: SmartUpdateService | null = null;
  private isInitialized = false;

  static getInstance(): SmartUpdateService {
    if (!this.instance) {
      this.instance = new SmartUpdateService();
    }
    return this.instance;
  }

  /**
   * Initialize smart updates after coordinated initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Wait for coordinated initialization to complete (especially theme)
      await this.waitForInitializationComplete();
      
      // Now it's safe to start version checks
      this.startVersionChecks();
      
      this.isInitialized = true;
      logger.info('Smart update service initialized', { module: 'smart-update' });
    } catch (error) {
      logger.error('Smart update service initialization failed:', error, { module: 'smart-update' });
    }
  }

  private async waitForInitializationComplete(): Promise<void> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const status = coordinatedInitService.getStatus();
        if (status.isComplete) {
          resolve();
        } else {
          // Subscribe to status changes
          const unsubscribe = coordinatedInitService.subscribe((status) => {
            if (status.isComplete) {
              unsubscribe();
              resolve();
            }
          });
        }
      };

      checkStatus();
    });
  }

  private startVersionChecks(): void {
    // Start periodic version checks
    // This will handle silent updates for anonymous users
    // and show notifications for authenticated users
    versionService.startPeriodicChecks();
    
    logger.info('Version checks started after theme initialization', { module: 'smart-update' });
  }

  /**
   * Reset the service state
   */
  reset(): void {
    this.isInitialized = false;
    versionService.stopPeriodicChecks();
  }
}

export const smartUpdateService = SmartUpdateService.getInstance();