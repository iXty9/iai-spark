
import { logger } from '@/utils/logging';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { updateStaticSiteConfig, createSiteConfig } from '@/services/site-config/site-config-file-service';
import { bootstrapPhases, BootstrapPhase } from './bootstrap-phases';
import { selfHealingBootstrap } from './self-healing-bootstrap';

export interface ProductionStatus {
  isHealthy: boolean;
  lastBootstrap: string | null;
  configSources: {
    urlParams: boolean;
    localStorage: boolean;
    staticFile: boolean;
    environment: boolean;
  };
  services: {
    bootstrap: boolean;
    client: boolean;
    auth: boolean;
    config: boolean;
  };
  errors: string[];
  uptime: number;
}

export class ProductionBootstrap {
  private static instance: ProductionBootstrap | null = null;
  private startTime: number = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  static getInstance(): ProductionBootstrap {
    if (!this.instance) {
      this.instance = new ProductionBootstrap();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Production bootstrap already initialized', { module: 'production-bootstrap' });
      return;
    }

    this.isInitialized = true;
    logger.info('Starting production bootstrap system', { module: 'production-bootstrap' });

    try {
      // Start all bootstrap services
      await this.startServices();
      
      // Set up health monitoring
      this.startHealthMonitoring();
      
      // Register global error handlers
      this.setupErrorHandling();
      
      logger.info('Production bootstrap initialized successfully', { module: 'production-bootstrap' });
    } catch (error) {
      logger.error('Failed to initialize production bootstrap', error, { module: 'production-bootstrap' });
      throw error;
    }
  }

  private async startServices(): Promise<void> {
    // Start self-healing bootstrap
    await selfHealingBootstrap.startSelfHealing();
    
    // Start bootstrap orchestrator
    const { bootstrapOrchestrator } = await import('./bootstrap-orchestrator');
    await bootstrapOrchestrator.bootstrap();
  }

  private startHealthMonitoring(): void {
    // Run health check every minute in production
    const interval = process.env.NODE_ENV === 'production' ? 60000 : 30000;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.getProductionStatus();
        
        if (!status.isHealthy) {
          logger.warn('Production health check failed', { 
            module: 'production-bootstrap',
            status
          });
          
          // Attempt automatic recovery
          await this.attemptRecovery();
        }
      } catch (error) {
        logger.error('Health check error', error, { module: 'production-bootstrap' });
      }
    }, interval);
  }

  private setupErrorHandling(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection in production', event.reason, {
          module: 'production-bootstrap',
          type: 'unhandled-rejection'
        });
        
        // Attempt to recover silently
        setTimeout(() => this.attemptRecovery(), 1000);
      });
    }
  }

  async getProductionStatus(): Promise<ProductionStatus> {
    const status: ProductionStatus = {
      isHealthy: false,
      lastBootstrap: localStorage.getItem('last_successful_bootstrap'),
      configSources: {
        urlParams: false,
        localStorage: false,
        staticFile: false,
        environment: false
      },
      services: {
        bootstrap: false,
        client: false,
        auth: false,
        config: false
      },
      errors: [],
      uptime: Date.now() - this.startTime
    };

    try {
      // Check configuration sources
      const configResult = await unifiedConfig.loadConfig();
      status.services.config = configResult.success;
      
      if (configResult.source) {
        status.configSources[configResult.source as keyof typeof status.configSources] = true;
      }

      // Check client status
      const clientState = clientManager.getState();
      status.services.client = clientState.client !== null;

      // Check bootstrap status
      const bootstrapState = bootstrapPhases.getState();
      status.services.bootstrap = bootstrapState.phase === BootstrapPhase.COMPLETE;

      // Check auth readiness (basic check)
      status.services.auth = status.services.client && status.services.bootstrap;

      // Overall health assessment
      status.isHealthy = Object.values(status.services).every(Boolean);

      if (!status.isHealthy) {
        if (!status.services.config) status.errors.push('Configuration service unavailable');
        if (!status.services.client) status.errors.push('Supabase client not ready');
        if (!status.services.bootstrap) status.errors.push('Bootstrap process incomplete');
        if (!status.services.auth) status.errors.push('Authentication system not ready');
      }

    } catch (error) {
      status.errors.push(error instanceof Error ? error.message : 'Unknown status check error');
      logger.error('Error getting production status', error, { module: 'production-bootstrap' });
    }

    return status;
  }

  private async attemptRecovery(): Promise<boolean> {
    logger.info('Attempting automatic recovery', { module: 'production-bootstrap' });

    try {
      // Try self-healing first
      const healingSuccess = await selfHealingBootstrap.performHealing();
      
      if (healingSuccess) {
        logger.info('Recovery successful via self-healing', { module: 'production-bootstrap' });
        return true;
      }

      // Try restarting bootstrap
      const { bootstrapOrchestrator } = await import('./bootstrap-orchestrator');
      await bootstrapOrchestrator.reset();
      await bootstrapOrchestrator.bootstrap();
      
      logger.info('Recovery successful via bootstrap restart', { module: 'production-bootstrap' });
      return true;

    } catch (error) {
      logger.error('Recovery attempt failed', error, { module: 'production-bootstrap' });
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
        logger.info('Static configuration updated successfully', { module: 'production-bootstrap' });
        localStorage.setItem('last_static_update', new Date().toISOString());
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update static configuration', error, { module: 'production-bootstrap' });
      return false;
    }
  }

  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    selfHealingBootstrap.stopSelfHealing();
    
    logger.info('Production bootstrap cleaned up', { module: 'production-bootstrap' });
  }
}

export const productionBootstrap = ProductionBootstrap.getInstance();
