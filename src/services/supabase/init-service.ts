
import { logger } from '@/utils/logging';
import { initializationService } from '@/services/config/initialization-service';
import { connectionService } from '@/services/config/connection-service';

/**
 * Legacy init service - now delegates to the new initialization service
 */
export const initSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.info('Legacy init service called - delegating to new initialization service', {
      module: 'init-service'
    });

    const result = await initializationService.initialize();
    
    return {
      success: result.isComplete,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Legacy init service failed', error, { module: 'init-service' });
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if Supabase is ready
 */
export const isSupabaseReady = (): boolean => {
  return connectionService.isReady();
};

/**
 * Get connection status
 */
export const getConnectionStatus = () => {
  return {
    isReady: connectionService.isReady(),
    hasConfig: connectionService.getCurrentConfig() !== null
  };
};
