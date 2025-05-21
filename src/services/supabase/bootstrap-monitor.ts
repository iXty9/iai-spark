
import { eventBus, AppEvents } from '@/utils/event-bus';
import { logger } from '@/utils/logging';
import { getEnvironmentInfo } from '@/config/supabase/environment';
import { resetSupabaseClient } from './connection-service';
import { bootstrapManager } from './bootstrap/bootstrap-manager';

// Mock functions for backward compatibility
export const checkPublicBootstrapConfig = async () => {
  logger.info('Bootstrap config check requested', { module: 'bootstrap-monitor' });
  return { exists: true, valid: true };
};

export const checkConnectionHealth = async () => {
  logger.info('Connection health check requested', { module: 'bootstrap-monitor' });
  return { isHealthy: true };
};

/**
 * Start monitoring bootstrap state
 */
export const monitorBootstrapState = () => {
  // Subscribe to bootstrap state changes
  eventBus.subscribe(AppEvents.BOOTSTRAP_STARTED, (event) => {
    logger.info('Bootstrap process started', { 
      module: 'bootstrap-monitor',
      state: event.state
    });
  });
  
  eventBus.subscribe(AppEvents.BOOTSTRAP_COMPLETED, () => {
    logger.info('Bootstrap completed successfully', { 
      module: 'bootstrap-monitor',
      environment: getEnvironmentInfo().id 
    });
  });
  
  eventBus.subscribe(AppEvents.BOOTSTRAP_FAILED, (context) => {
    logger.error('Bootstrap process failed', { 
      module: 'bootstrap-monitor',
      reason: context.error,
      errorType: context.errorType
    });
  });
  
  // Poll for bootstrap state changes
  let monitoringInterval: number | null = null;
  
  const startMonitoring = () => {
    if (!monitoringInterval) {
      monitoringInterval = window.setInterval(() => {
        const context = bootstrapManager.getContext();
        if (context.state === 'COMPLETE') {
          stopMonitoring();
        }
      }, 5000);
    }
  };
  
  const stopMonitoring = () => {
    if (monitoringInterval !== null) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  };
  
  // Start monitoring
  startMonitoring();
  
  // Subscribe to visibility changes
  eventBus.subscribe(AppEvents.TAB_VISIBLE, () => {
    resetSupabaseClient();
    bootstrapManager.startBootstrap();
  });
  
  // Clean up when app unmounts
  eventBus.subscribe(AppEvents.APP_UNMOUNTED, () => {
    stopMonitoring();
  });
  
  // Return controls
  return { startMonitoring, stopMonitoring };
};

// Export a singleton instance of the monitor
export const bootstrapMonitor = monitorBootstrapState();
