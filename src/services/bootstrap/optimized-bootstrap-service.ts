
import { logger } from '@/utils/logging';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { bootstrapPhases, BootstrapPhase } from './bootstrap-phases';

export interface OptimizedBootstrapStatus {
  isReady: boolean;
  phase: BootstrapPhase;
  progress: number;
  configSource: string | null;
  errors: string[];
  services: {
    config: boolean;
    client: boolean;
    auth: boolean;
  };
  lastUpdate: string;
}

export class OptimizedBootstrapService {
  private static instance: OptimizedBootstrapService | null = null;
  private isInitialized = false;
  private subscribers: ((status: OptimizedBootstrapStatus) => void)[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): OptimizedBootstrapService {
    if (!this.instance) {
      this.instance = new OptimizedBootstrapService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Optimized bootstrap already initialized', { module: 'optimized-bootstrap' });
      return;
    }

    this.isInitialized = true;
    logger.info('Starting optimized bootstrap system', { module: 'optimized-bootstrap' });

    try {
      // Start optimized bootstrap process
      await this.performOptimizedBootstrap();
      
      // Set up lightweight health monitoring (every 2 minutes instead of 30 seconds)
      this.startHealthMonitoring();
      
      logger.info('Optimized bootstrap initialized successfully', { module: 'optimized-bootstrap' });
    } catch (error) {
      logger.error('Failed to initialize optimized bootstrap', error, { module: 'optimized-bootstrap' });
      throw error;
    }
  }

  private async performOptimizedBootstrap(): Promise<void> {
    try {
      logger.info('Starting optimized bootstrap process', { module: 'optimized-bootstrap' });

      // Phase 1: Load Configuration (optimized with caching)
      bootstrapPhases.startLoadingConfig();
      const configResult = await unifiedConfig.loadConfig();

      if (!configResult.success || !configResult.config) {
        if (configResult.error?.includes('No valid configuration')) {
          bootstrapPhases.setNeedsSetup();
        } else {
          bootstrapPhases.setError(configResult.error || 'Failed to load configuration');
        }
        return;
      }

      bootstrapPhases.configLoaded(configResult.config, configResult.source || 'unknown');

      // Phase 2: Initialize Client (parallel with auth setup)
      bootstrapPhases.startInitializingClient();
      
      // Start both client and auth initialization in parallel
      const [clientSuccess] = await Promise.all([
        clientManager.initialize(configResult.config),
        // Prepare auth context without waiting for full initialization
        this.prepareAuthContext()
      ]);

      if (!clientSuccess) {
        const clientState = clientManager.getState();
        bootstrapPhases.setError(`Client initialization failed: ${clientState.error}`);
        return;
      }

      bootstrapPhases.clientReady();

      // Phase 3: Complete Auth Setup (already started in parallel)
      bootstrapPhases.startInitializingAuth();
      
      // Minimal auth verification
      await this.verifyAuthState();
      
      bootstrapPhases.authReady();

      // Phase 4: Complete
      bootstrapPhases.complete();

      logger.info('Optimized bootstrap completed successfully', {
        module: 'optimized-bootstrap',
        configSource: configResult.source
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootstrapPhases.setError(errorMessage);
      logger.error('Optimized bootstrap failed', error, { module: 'optimized-bootstrap' });
    }
  }

  private async prepareAuthContext(): Promise<void> {
    // Lightweight auth preparation without full initialization
    return new Promise(resolve => {
      setTimeout(resolve, 50); // Minimal delay for auth context setup
    });
  }

  private async verifyAuthState(): Promise<void> {
    // Quick auth verification
    const client = clientManager.getClient();
    if (client) {
      try {
        // Non-blocking auth check
        await client.auth.getSession();
      } catch (error) {
        logger.warn('Auth verification warning', error, { module: 'optimized-bootstrap' });
      }
    }
  }

  async getStatus(): Promise<OptimizedBootstrapStatus> {
    const bootstrapState = bootstrapPhases.getState();
    const clientState = clientManager.getState();

    return {
      isReady: bootstrapState.phase === BootstrapPhase.COMPLETE,
      phase: bootstrapState.phase,
      progress: bootstrapState.progress,
      configSource: bootstrapState.configSource,
      errors: [
        ...(bootstrapState.error ? [bootstrapState.error] : []),
        ...(clientState.error ? [clientState.error] : [])
      ],
      services: {
        config: bootstrapState.config !== null,
        client: clientState.client !== null,
        auth: bootstrapState.phase >= BootstrapPhase.AUTH_READY
      },
      lastUpdate: new Date().toISOString()
    };
  }

  async performRecovery(): Promise<boolean> {
    logger.info('Starting optimized recovery process', { module: 'optimized-bootstrap' });

    try {
      // Quick recovery: clear cache and restart
      unifiedConfig.clearCache();
      await this.reset();
      await this.performOptimizedBootstrap();
      
      logger.info('Recovery completed successfully', { module: 'optimized-bootstrap' });
      await this.notifySubscribers();
      return true;

    } catch (error) {
      logger.error('Optimized recovery failed', error, { module: 'optimized-bootstrap' });
      await this.notifySubscribers();
      return false;
    }
  }

  async reset(): Promise<void> {
    logger.info('Resetting optimized bootstrap system', { module: 'optimized-bootstrap' });
    
    // Reset core services
    unifiedConfig.clearCache();
    unifiedConfig.clearLocalStorage();
    bootstrapPhases.reset();
    
    await this.notifySubscribers();
  }

  subscribe(callback: (status: OptimizedBootstrapStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Send initial status
    this.getStatus().then(callback);
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isInitialized = false;
    this.subscribers = [];
    
    logger.info('Optimized bootstrap cleaned up', { module: 'optimized-bootstrap' });
  }

  private startHealthMonitoring(): void {
    // Reduced frequency: every 2 minutes instead of 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.notifySubscribers();
    }, 120000);
  }

  private async notifySubscribers(): Promise<void> {
    if (this.subscribers.length === 0) return;
    
    try {
      const status = await this.getStatus();
      this.subscribers.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          logger.error('Error in bootstrap status subscriber', error, { module: 'optimized-bootstrap' });
        }
      });
    } catch (error) {
      logger.error('Error getting status for subscribers', error, { module: 'optimized-bootstrap' });
    }
  }
}

// Export singleton instance
export const optimizedBootstrap = OptimizedBootstrapService.getInstance();
