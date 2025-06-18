
/**
 * Centralized cleanup service for all global resources
 * Ensures proper cleanup of all global services and prevents memory leaks
 */

import { logger } from '@/utils/logging';
import { domManagerService } from './dom-manager-service';
import { eventManagerService } from './event-manager-service';
import { timerManagerService } from './timer-manager-service';
import { globalStateService } from '../debug/global-state-service';
import { cleanupDebugEvents } from '@/utils/debug-events';

class GlobalCleanupService {
  private isInitialized = false;
  private cleanupCallbacks = new Set<() => void>();

  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Set up cleanup on page unload
    if (typeof window !== 'undefined') {
      const handleUnload = () => {
        this.cleanup();
      };

      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);

      // Also cleanup on visibility change (for mobile)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.cleanup();
        }
      });
    }

    logger.info('Global cleanup service initialized', null, { module: 'global-cleanup' });
  }

  addCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    
    // Return a function to remove the callback
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  cleanup() {
    try {
      // Clean up all services
      domManagerService.destroy();
      eventManagerService.destroy();
      timerManagerService.destroy();
      globalStateService.clearDebugState();
      cleanupDebugEvents();

      // Run custom cleanup callbacks
      this.cleanupCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          logger.warn('Error in cleanup callback', error, { module: 'global-cleanup' });
        }
      });

      this.cleanupCallbacks.clear();

      logger.info('Global cleanup completed', {
        timers: timerManagerService.getTimerCount(),
        listeners: eventManagerService.getListenerCount()
      }, { module: 'global-cleanup' });

    } catch (error) {
      logger.error('Error during global cleanup', error, { module: 'global-cleanup' });
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeTimers: timerManagerService.getTimerCount(),
      activeListeners: eventManagerService.getListenerCount(),
      cleanupCallbacks: this.cleanupCallbacks.size
    };
  }
}

export const globalCleanupService = new GlobalCleanupService();

// Auto-initialize
if (typeof window !== 'undefined') {
  globalCleanupService.initialize();
}
