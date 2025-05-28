
import { logger } from '@/utils/logging';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { bootstrapPhases, BootstrapPhase } from './bootstrap-phases';
import { productionBootstrap } from './production-bootstrap';
import { selfHealingBootstrap } from './self-healing-bootstrap';
import { bootstrapOrchestrator } from './bootstrap-orchestrator';
import { updateStaticSiteConfig, createSiteConfig } from '@/services/site-config/site-config-file-service';

export interface UnifiedBootstrapStatus {
  isReady: boolean;
  phase: BootstrapPhase;
  progress: number;
  configSource: string | null;
  errors: string[];
  services: {
    config: boolean;
    client: boolean;
    auth: boolean;
    production: boolean;
    selfHealing: boolean;
  };
  lastUpdate: string;
}

export class UnifiedBootstrapService {
  private static instance: UnifiedBootstrapService | null = null;
  private isInitialized = false;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private subscribers: ((status: UnifiedBootstrapStatus) => void)[] = [];

  static getInstance(): UnifiedBootstrapService {
    if (!this.instance) {
      this.instance = new UnifiedBootstrapService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Unified bootstrap already initialized', { module: 'unified-bootstrap' });
      return;
    }

    this.isInitialized = true;
    logger.info('Starting unified bootstrap system', { module: 'unified-bootstrap' });

    try {
      // Initialize all bootstrap services in correct order
      await productionBootstrap.initialize();
      await selfHealingBootstrap.startSelfHealing();
      
      // Start the orchestrator
      await bootstrapOrchestrator.bootstrap();
      
      // Set up status monitoring
      this.startStatusMonitoring();
      
      logger.info('Unified bootstrap initialized successfully', { module: 'unified-bootstrap' });
    } catch (error) {
      logger.error('Failed to initialize unified bootstrap', error, { module: 'unified-bootstrap' });
      throw error;
    }
  }

  async getStatus(): Promise<UnifiedBootstrapStatus> {
    const bootstrapState = bootstrapPhases.getState();
    const clientState = clientManager.getState();
    const productionStatus = await productionBootstrap.getProductionStatus();

    return {
      isReady: bootstrapState.phase === BootstrapPhase.COMPLETE,
      phase: bootstrapState.phase,
      progress: bootstrapState.progress,
      configSource: bootstrapState.configSource,
      errors: [
        ...(bootstrapState.error ? [bootstrapState.error] : []),
        ...(clientState.error ? [clientState.error] : []),
        ...productionStatus.errors
      ],
      services: {
        config: productionStatus.services.config,
        client: productionStatus.services.client,
        auth: productionStatus.services.auth,
        production: productionStatus.isHealthy,
        selfHealing: true // Self-healing is always running if we reach here
      },
      lastUpdate: new Date().toISOString()
    };
  }

  async performRecovery(): Promise<boolean> {
    logger.info('Starting unified recovery process', { module: 'unified-bootstrap' });

    try {
      // Step 1: Try self-healing first
      const healingSuccess = await selfHealingBootstrap.performHealing();
      if (healingSuccess) {
        logger.info('Recovery successful via self-healing', { module: 'unified-bootstrap' });
        await this.notifySubscribers();
        return true;
      }

      // Step 2: Try production bootstrap recovery
      const productionSuccess = await productionBootstrap.updateStaticConfiguration();
      if (productionSuccess) {
        // Reset and restart bootstrap
        await this.reset();
        await bootstrapOrchestrator.bootstrap();
        logger.info('Recovery successful via production bootstrap', { module: 'unified-bootstrap' });
        await this.notifySubscribers();
        return true;
      }

      // Step 3: Force configuration reload
      unifiedConfig.clearCache();
      await bootstrapOrchestrator.reset();
      await bootstrapOrchestrator.bootstrap();
      
      logger.info('Recovery completed via configuration reload', { module: 'unified-bootstrap' });
      await this.notifySubscribers();
      return true;

    } catch (error) {
      logger.error('Unified recovery failed', error, { module: 'unified-bootstrap' });
      await this.notifySubscribers();
      return false;
    }
  }

  async updateStaticConfiguration(): Promise<boolean> {
    try {
      const configResult = await unifiedConfig.loadConfig();
      
      if (!configResult.success || !configResult.config) {
        return false;
      }

      const siteConfig = createSiteConfig(configResult.config.url, configResult.config.anonKey);
      const success = await updateStaticSiteConfig(siteConfig);
      
      if (success) {
        logger.info('Static configuration updated via unified service', { module: 'unified-bootstrap' });
        localStorage.setItem('last_static_update', new Date().toISOString());
        await this.notifySubscribers();
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update static configuration', error, { module: 'unified-bootstrap' });
      return false;
    }
  }

  async reset(): Promise<void> {
    logger.info('Resetting unified bootstrap system', { module: 'unified-bootstrap' });
    
    // Reset all services
    await bootstrapOrchestrator.reset();
    unifiedConfig.clearCache();
    unifiedConfig.clearLocalStorage();
    
    // Clear state
    bootstrapPhases.reset();
    
    await this.notifySubscribers();
  }

  subscribe(callback: (status: UnifiedBootstrapStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Send initial status
    this.getStatus().then(callback);
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  cleanup(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
    
    selfHealingBootstrap.stopSelfHealing();
    productionBootstrap.cleanup();
    
    this.isInitialized = false;
    this.subscribers = [];
    
    logger.info('Unified bootstrap cleaned up', { module: 'unified-bootstrap' });
  }

  private startStatusMonitoring(): void {
    // Update subscribers every 30 seconds
    this.statusUpdateInterval = setInterval(async () => {
      await this.notifySubscribers();
    }, 30000);
  }

  private async notifySubscribers(): Promise<void> {
    if (this.subscribers.length === 0) return;
    
    try {
      const status = await this.getStatus();
      this.subscribers.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          logger.error('Error in bootstrap status subscriber', error, { module: 'unified-bootstrap' });
        }
      });
    } catch (error) {
      logger.error('Error getting status for subscribers', error, { module: 'unified-bootstrap' });
    }
  }
}

// Export singleton instance
export const unifiedBootstrap = UnifiedBootstrapService.getInstance();
