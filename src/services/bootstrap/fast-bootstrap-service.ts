
import { logger } from '@/utils/logging';
import { coordinatedInitService, InitializationStatus } from '@/services/initialization/coordinated-init-service';

export interface FastBootstrapStatus {
  isReady: boolean;
  needsSetup: boolean;
  needsReconnection?: boolean;
  error?: string;
  phase: 'loading' | 'ready' | 'setup' | 'reconnection' | 'error';
}

/**
 * Fast bootstrap service using coordinated initialization
 */
export class FastBootstrapService {
  private static instance: FastBootstrapService | null = null;
  private isBootstrapping = false;
  private subscribers: ((status: FastBootstrapStatus) => void)[] = [];

  static getInstance(): FastBootstrapService {
    if (!this.instance) {
      this.instance = new FastBootstrapService();
    }
    return this.instance;
  }

  async initialize(): Promise<FastBootstrapStatus> {
    if (this.isBootstrapping) {
      logger.warn('Bootstrap already in progress', { module: 'fast-bootstrap' });
      return this.getStatus();
    }

    this.isBootstrapping = true;

    try {
      logger.info('Starting fast bootstrap with coordinated initialization', { module: 'fast-bootstrap' });
      
      this.notifySubscribers({ isReady: false, needsSetup: false, phase: 'loading' });

      // Use coordinated initialization
      const initResult = await coordinatedInitService.initialize();

      if (initResult.phase === 'error') {
        // Check if we need setup or reconnection
        if (initResult.error?.includes('Configuration not found')) {
          const setupStatus = { isReady: false, needsSetup: true, phase: 'setup' as const };
          this.notifySubscribers(setupStatus);
          return setupStatus;
        } else {
          const reconnectionStatus = { 
            isReady: false, 
            needsSetup: false, 
            needsReconnection: true, 
            phase: 'reconnection' as const,
            error: initResult.error
          };
          this.notifySubscribers(reconnectionStatus);
          return reconnectionStatus;
        }
      }

      if (initResult.isComplete) {
        logger.info('Fast bootstrap completed successfully', { module: 'fast-bootstrap' });
        const readyStatus = { isReady: true, needsSetup: false, phase: 'ready' as const };
        this.notifySubscribers(readyStatus);
        return readyStatus;
      }

      // Still in progress
      const loadingStatus = { isReady: false, needsSetup: false, phase: 'loading' as const };
      this.notifySubscribers(loadingStatus);
      return loadingStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Fast bootstrap failed', error, { module: 'fast-bootstrap' });
      const errorStatus = { 
        isReady: false, 
        needsSetup: false, 
        phase: 'error' as const,
        error: errorMessage
      };
      this.notifySubscribers(errorStatus);
      return errorStatus;
    } finally {
      this.isBootstrapping = false;
    }
  }

  private checkForLocalConfiguration(): boolean {
    try {
      const configs = [
        localStorage.getItem('site-config'),
        localStorage.getItem('supabase_config'),
        localStorage.getItem('supabase-config')
      ];
      
      return configs.some(config => {
        if (!config) return false;
        try {
          const parsed = JSON.parse(config);
          return !!(parsed && parsed.supabaseUrl && parsed.supabaseAnonKey);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  getStatus(): FastBootstrapStatus {
    const initStatus = coordinatedInitService.getStatus();
    
    if (initStatus.isComplete) {
      return { isReady: true, needsSetup: false, phase: 'ready' };
    }
    
    // Check for reconnection scenario
    if (this.checkForLocalConfiguration()) {
      return { isReady: false, needsSetup: false, needsReconnection: true, phase: 'reconnection' };
    }
    
    return { isReady: false, needsSetup: false, phase: 'loading' };
  }

  subscribe(callback: (status: FastBootstrapStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Send current status immediately
    callback(this.getStatus());
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(status: FastBootstrapStatus): void {
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in bootstrap status subscriber', error, { module: 'fast-bootstrap' });
      }
    });
  }

  reset(): void {
    this.isBootstrapping = false;
    coordinatedInitService.reset();
    logger.info('Fast bootstrap reset', { module: 'fast-bootstrap' });
  }
}

// Export singleton instance
export const fastBootstrap = FastBootstrapService.getInstance();
