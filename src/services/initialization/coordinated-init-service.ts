
import { logger } from '@/utils/logging';
import { clientManager } from '@/services/supabase/client-manager';
import { themeService } from '@/services/theme-service';
import { unifiedThemeController } from '@/services/unified-theme-controller';
import { backgroundStateManager } from '@/services/background-state-manager';
import { fastConfig } from '@/services/config/fast-config-service';

export interface InitializationStatus {
  phase: 'starting' | 'config' | 'client' | 'theme' | 'complete' | 'error';
  isComplete: boolean;
  error?: string;
  details?: string;
}

/**
 * Coordinated initialization service that ensures proper order
 */
class CoordinatedInitService {
  private static instance: CoordinatedInitService | null = null;
  private isInitializing = false;
  private isComplete = false;
  private subscribers: ((status: InitializationStatus) => void)[] = [];

  static getInstance(): CoordinatedInitService {
    if (!this.instance) {
      this.instance = new CoordinatedInitService();
    }
    return this.instance;
  }

  async initialize(): Promise<InitializationStatus> {
    if (this.isComplete) {
      return { phase: 'complete', isComplete: true };
    }

    if (this.isInitializing) {
      logger.warn('Initialization already in progress', { module: 'coordinated-init' });
      return { phase: 'starting', isComplete: false };
    }

    this.isInitializing = true;

    try {
      logger.info('Starting coordinated initialization', { module: 'coordinated-init' });

      // Phase 1: Load configuration
      this.notifySubscribers({ phase: 'config', isComplete: false, details: 'Loading configuration' });
      const configResult = await fastConfig.loadConfig();

      if (!configResult.success || !configResult.config) {
        const errorStatus = { 
          phase: 'error' as const, 
          isComplete: false, 
          error: 'Configuration not found or invalid'
        };
        this.notifySubscribers(errorStatus);
        return errorStatus;
      }

      // Phase 2: Initialize and wait for client readiness
      this.notifySubscribers({ phase: 'client', isComplete: false, details: 'Initializing Supabase client' });
      const clientSuccess = await clientManager.initialize(configResult.config);

      if (!clientSuccess) {
        const errorStatus = { 
          phase: 'error' as const, 
          isComplete: false, 
          error: 'Failed to initialize Supabase client'
        };
        this.notifySubscribers(errorStatus);
        return errorStatus;
      }

      // Wait for full client readiness
      const isReady = await clientManager.waitForReadiness();
      if (!isReady) {
        const errorStatus = { 
          phase: 'error' as const, 
          isComplete: false, 
          error: 'Client readiness timeout'
        };
        this.notifySubscribers(errorStatus);
        return errorStatus;
      }

      // Phase 3: Initialize theme system
      this.notifySubscribers({ phase: 'theme', isComplete: false, details: 'Initializing theme system' });
      
      // Initialize base theme service first
      await themeService.initialize({
        enableTransitions: true,
        fallbackToDefaults: true,
        persistToLocalStorage: true
      });

      // Initialize unified controller (will load user settings if available)
      await unifiedThemeController.initialize();

      // Phase 4: Complete
      this.isComplete = true;
      this.isInitializing = false;
      
      const completeStatus = { phase: 'complete' as const, isComplete: true };
      this.notifySubscribers(completeStatus);
      
      logger.info('Coordinated initialization complete', { module: 'coordinated-init' });
      return completeStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Coordinated initialization failed', error, { module: 'coordinated-init' });
      
      this.isInitializing = false;
      const errorStatus = { 
        phase: 'error' as const, 
        isComplete: false, 
        error: errorMessage
      };
      this.notifySubscribers(errorStatus);
      return errorStatus;
    }
  }

  getStatus(): InitializationStatus {
    if (this.isComplete) {
      return { phase: 'complete', isComplete: true };
    }
    if (this.isInitializing) {
      return { phase: 'starting', isComplete: false };
    }
    return { phase: 'starting', isComplete: false };
  }

  subscribe(callback: (status: InitializationStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Send current status immediately
    callback(this.getStatus());
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(status: InitializationStatus): void {
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in initialization status subscriber', error, { module: 'coordinated-init' });
      }
    });
  }

  reset(): void {
    this.isInitializing = false;
    this.isComplete = false;
    clientManager.destroy();
    logger.info('Coordinated initialization reset', { module: 'coordinated-init' });
  }
}

export const coordinatedInitService = CoordinatedInitService.getInstance();
