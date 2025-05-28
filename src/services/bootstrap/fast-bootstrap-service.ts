
import { logger } from '@/utils/logging';
import { fastConfig } from '@/services/config/fast-config-service';
import { clientManager } from '@/services/supabase/client-manager';

export interface FastBootstrapStatus {
  isReady: boolean;
  needsSetup: boolean;
  needsReconnection?: boolean;
  error?: string;
  phase: 'loading' | 'ready' | 'setup' | 'reconnection' | 'error';
}

/**
 * Ultra-fast bootstrap service with no artificial delays or complex orchestration
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
      logger.info('Starting fast bootstrap', { module: 'fast-bootstrap' });
      
      this.notifySubscribers({ isReady: false, needsSetup: false, phase: 'loading' });

      // Step 1: Load config directly from site-config.json
      const configResult = await fastConfig.loadConfig();

      if (!configResult.success || !configResult.config) {
        // Check if we have local storage config (reconnection scenario)
        const hasLocalConfig = this.checkForLocalConfiguration();
        
        if (hasLocalConfig) {
          logger.info('No valid config found but local config detected, needs reconnection', { module: 'fast-bootstrap' });
          const reconnectionStatus = { isReady: false, needsSetup: false, needsReconnection: true, phase: 'reconnection' as const };
          this.notifySubscribers(reconnectionStatus);
          return reconnectionStatus;
        } else {
          logger.info('No valid config found, needs setup', { module: 'fast-bootstrap' });
          const setupStatus = { isReady: false, needsSetup: true, phase: 'setup' as const };
          this.notifySubscribers(setupStatus);
          return setupStatus;
        }
      }

      // Step 2: Initialize Supabase client directly
      const clientSuccess = await clientManager.initialize(configResult.config);

      if (!clientSuccess) {
        const clientState = clientManager.getState();
        const errorStatus = { 
          isReady: false, 
          needsSetup: false, 
          phase: 'error' as const,
          error: `Client initialization failed: ${clientState.error}`
        };
        this.notifySubscribers(errorStatus);
        return errorStatus;
      }

      // Step 3: Ready!
      logger.info('Fast bootstrap completed successfully', { module: 'fast-bootstrap' });
      const readyStatus = { isReady: true, needsSetup: false, phase: 'ready' as const };
      this.notifySubscribers(readyStatus);
      return readyStatus;

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
    const clientState = clientManager.getState();
    
    if (clientState.client) {
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
    clientManager.destroy();
    logger.info('Fast bootstrap reset', { module: 'fast-bootstrap' });
  }
}

// Export singleton instance
export const fastBootstrap = FastBootstrapService.getInstance();
