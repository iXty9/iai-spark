/**
 * Bootstrap monitor service
 * Provides automatic recovery and monitoring for bootstrap process
 */

import { logger } from '@/utils/logging';
import { checkPublicBootstrapConfig, checkConnectionHealth } from './connection-service';

class BootstrapMonitorService {
  private retryCount: number = 0;
  private maxRetries: number = 3; // Reduced from 5 to 3
  private retryDelay: number = 2000; // Increased from 1000ms to 2000ms
  private isMonitoring: boolean = false;
  private timeoutId: number | null = null;
  private isTabVisible: boolean = true;
  
  constructor() {
    // Monitor tab visibility for smarter monitoring
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.isTabVisible = document.visibilityState === 'visible';
    }
  }
  
  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined') {
      this.isTabVisible = document.visibilityState === 'visible';
      logger.debug('Tab visibility changed in bootstrap monitor', 
        { isVisible: this.isTabVisible }, 
        { module: 'bootstrap-monitor' }
      );
    }
  }

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
    
    // Remove visibility change listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
  
  /**
   * Check bootstrap status and attempt recovery if needed
   */
  private async checkStatus(): Promise<void> {
    if (!this.isMonitoring) return;
    
    // Skip checking when tab is not visible
    if (!this.isTabVisible) {
      logger.debug('Skipping bootstrap check in background tab', 
        {}, { module: 'bootstrap-monitor' });
      
      // Still keep monitoring but at a reduced rate
      this.timeoutId = window.setTimeout(() => this.checkStatus(), 60000); // 1 minute
      return;
    }
    
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
          const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
          
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
          this.timeoutId = window.setTimeout(() => this.checkStatus(), 5 * 60 * 1000); // 5 minutes
        }
      } else if (isConnected) {
        // Connected, continue monitoring at a slower rate
        this.retryCount = 0;
        this.timeoutId = window.setTimeout(() => this.checkStatus(), 5 * 60 * 1000); // 5 minutes
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
      
      // Continue monitoring despite errors, but with a longer interval
      this.timeoutId = window.setTimeout(() => this.checkStatus(), 10000); // 10 seconds
    }
  }
}

// Export singleton instance
export const bootstrapMonitor = new BootstrapMonitorService();
