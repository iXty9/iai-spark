
/**
 * Bootstrap monitor service
 * Provides automatic recovery and monitoring for bootstrap process
 */

import { logger } from '@/utils/logging';
import { checkPublicBootstrapConfig, checkConnectionHealth } from './connection-service';

class BootstrapMonitorService {
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000; // Start with 1 second
  private isMonitoring: boolean = false;
  private timeoutId: number | null = null;

  /**
   * Start monitoring the bootstrap process
   */
  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.retryCount = 0;
    
    logger.info('Starting bootstrap monitor', {
      module: 'bootstrap-monitor'
    });
    
    this.checkStatus();
  }
  
  /**
   * Stop monitoring the bootstrap process
   */
  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    logger.info('Stopped bootstrap monitor', {
      module: 'bootstrap-monitor'
    });
  }
  
  /**
   * Check bootstrap status and attempt recovery if needed
   */
  private async checkStatus(): Promise<void> {
    if (!this.isMonitoring) return;
    
    try {
      // Check if we're connected
      const isConnected = await checkConnectionHealth();
      
      if (!isConnected && this.retryCount < this.maxRetries) {
        // Not connected, attempt recovery
        this.retryCount++;
        
        logger.info(`Bootstrap recovery attempt ${this.retryCount}/${this.maxRetries}`, {
          module: 'bootstrap-monitor'
        });
        
        // Try to bootstrap
        const success = await checkPublicBootstrapConfig();
        
        if (!success) {
          // Schedule another attempt with exponential backoff
          const delay = this.retryDelay * Math.pow(1.5, this.retryCount - 1);
          
          logger.info(`Scheduling next bootstrap recovery in ${delay}ms`, {
            module: 'bootstrap-monitor'
          });
          
          this.timeoutId = window.setTimeout(() => this.checkStatus(), delay);
        } else {
          // Reset retry count on success
          this.retryCount = 0;
          
          logger.info('Bootstrap recovery successful', {
            module: 'bootstrap-monitor'
          });
          
          // Continue monitoring at a slower rate
          this.timeoutId = window.setTimeout(() => this.checkStatus(), 30000);
        }
      } else if (isConnected) {
        // Connected, continue monitoring at a slower rate
        this.retryCount = 0;
        this.timeoutId = window.setTimeout(() => this.checkStatus(), 30000);
      } else {
        // Max retries reached, stop monitoring
        logger.warn('Bootstrap recovery failed after maximum attempts', {
          module: 'bootstrap-monitor'
        });
        
        this.stop();
      }
    } catch (error) {
      logger.error('Error in bootstrap monitor', error, {
        module: 'bootstrap-monitor'
      });
      
      // Continue monitoring despite errors
      this.timeoutId = window.setTimeout(() => this.checkStatus(), 5000);
    }
  }
}

// Export singleton instance
export const bootstrapMonitor = new BootstrapMonitorService();
