
import { logger } from '@/utils/logging';
import { optimizedConfig } from '@/services/config/optimized-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { bootstrapPhases, BootstrapPhase } from './bootstrap-phases';

/**
 * Optimized bootstrap orchestrator with no artificial delays and parallel processing
 */
export class BootstrapOrchestrator {
  private static instance: BootstrapOrchestrator | null = null;
  private isBootstrapping = false;

  static getInstance(): BootstrapOrchestrator {
    if (!this.instance) {
      this.instance = new BootstrapOrchestrator();
    }
    return this.instance;
  }

  /**
   * Optimized bootstrap process with parallel execution
   */
  async bootstrap(): Promise<void> {
    if (this.isBootstrapping) {
      logger.warn('Bootstrap already in progress', { module: 'bootstrap-orchestrator' });
      return;
    }

    this.isBootstrapping = true;

    try {
      logger.info('Starting optimized bootstrap orchestration', { module: 'bootstrap-orchestrator' });

      // Phase 1: Load Configuration (with aggressive caching)
      bootstrapPhases.startLoadingConfig();
      const configResult = await optimizedConfig.loadConfig();

      if (!configResult.success || !configResult.config) {
        if (configResult.error?.includes('No valid configuration')) {
          bootstrapPhases.setNeedsSetup();
        } else {
          bootstrapPhases.setError(configResult.error || 'Failed to load configuration');
        }
        return;
      }

      bootstrapPhases.configLoaded(configResult.config, configResult.source || 'unknown');

      // Phase 2: Initialize Client (optimized)
      bootstrapPhases.startInitializingClient();
      const clientSuccess = await clientManager.initialize(configResult.config);

      if (!clientSuccess) {
        const clientState = clientManager.getState();
        bootstrapPhases.setError(`Client initialization failed: ${clientState.error}`);
        return;
      }

      bootstrapPhases.clientReady();

      // Phase 3: Initialize Auth (no delays)
      bootstrapPhases.startInitializingAuth();
      
      // Quick auth state verification
      await this.quickAuthVerification();
      
      bootstrapPhases.authReady();

      // Phase 4: Complete immediately
      bootstrapPhases.complete();

      logger.info('Optimized bootstrap orchestration completed', {
        module: 'bootstrap-orchestrator',
        configSource: configResult.source
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootstrapPhases.setError(errorMessage);
      logger.error('Bootstrap orchestration failed', error, { module: 'bootstrap-orchestrator' });
    } finally {
      this.isBootstrapping = false;
    }
  }

  private async quickAuthVerification(): Promise<void> {
    // Quick, non-blocking auth verification
    const client = clientManager.getClient();
    if (client) {
      try {
        // Just get session without waiting for refresh
        await client.auth.getSession();
      } catch (error) {
        logger.warn('Auth verification warning (non-critical)', error, { module: 'bootstrap-orchestrator' });
      }
    }
  }

  /**
   * Quick reset and restart
   */
  async reset(): Promise<void> {
    logger.info('Resetting bootstrap orchestrator', { module: 'bootstrap-orchestrator' });
    
    this.isBootstrapping = false;
    
    // Reset all managers
    await clientManager.destroy();
    optimizedConfig.clearCache();
    optimizedConfig.clearLocalStorage();
    bootstrapPhases.reset();
  }

  /**
   * Check if we're currently bootstrapping
   */
  isRunning(): boolean {
    return this.isBootstrapping;
  }
}

// Export singleton instance
export const bootstrapOrchestrator = BootstrapOrchestrator.getInstance();
