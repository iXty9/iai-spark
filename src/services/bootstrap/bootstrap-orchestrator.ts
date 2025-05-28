
import { logger } from '@/utils/logging';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { bootstrapPhases, BootstrapPhase } from './bootstrap-phases';

/**
 * Orchestrates the complete bootstrap process through all phases
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
   * Run complete bootstrap process with optimized timing
   */
  async bootstrap(): Promise<void> {
    if (this.isBootstrapping) {
      logger.warn('Bootstrap already in progress', { module: 'bootstrap-orchestrator' });
      return;
    }

    this.isBootstrapping = true;

    try {
      logger.info('Starting optimized bootstrap orchestration', { module: 'bootstrap-orchestrator' });

      // Phase 1: Load Configuration (fast)
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

      // Phase 2: Initialize Client (optimized)
      bootstrapPhases.startInitializingClient();
      const clientSuccess = await clientManager.initialize(configResult.config);

      if (!clientSuccess) {
        const clientState = clientManager.getState();
        bootstrapPhases.setError(`Client initialization failed: ${clientState.error}`);
        return;
      }

      bootstrapPhases.clientReady();

      // Phase 3: Initialize Auth (minimal delay)
      bootstrapPhases.startInitializingAuth();
      
      // Minimal settle time for auth state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      bootstrapPhases.authReady();

      // Phase 4: Complete immediately
      bootstrapPhases.complete();

      logger.info('Optimized bootstrap orchestration completed', {
        module: 'bootstrap-orchestrator',
        configSource: configResult.source,
        duration: 'fast'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootstrapPhases.setError(errorMessage);
      logger.error('Bootstrap orchestration failed', error, { module: 'bootstrap-orchestrator' });
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Reset everything and start fresh
   */
  async reset(): Promise<void> {
    logger.info('Resetting bootstrap orchestrator', { module: 'bootstrap-orchestrator' });
    
    this.isBootstrapping = false;
    
    // Reset all managers
    await clientManager.destroy();
    unifiedConfig.clearCache();
    unifiedConfig.clearLocalStorage();
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
