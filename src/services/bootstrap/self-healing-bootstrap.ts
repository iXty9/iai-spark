
import { logger } from '@/utils/logging';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { updateStaticSiteConfig, createSiteConfig } from '@/services/site-config/site-config-file-service';
import { testSupabaseConnection } from '@/services/supabase/simplified-connection-service';
import { SupabaseConfig } from '@/config/supabase/types';

export interface BootstrapStatus {
  isHealthy: boolean;
  lastSuccessfulBootstrap: string | null;
  configSources: {
    urlParams: boolean;
    localStorage: boolean;
    staticFile: boolean;
    environment: boolean;
  };
  errors: string[];
  clientInstances: number;
}

export class SelfHealingBootstrap {
  private static instance: SelfHealingBootstrap | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SelfHealingBootstrap {
    if (!this.instance) {
      this.instance = new SelfHealingBootstrap();
    }
    return this.instance;
  }

  /**
   * Start the self-healing process
   */
  async startSelfHealing(): Promise<void> {
    logger.info('Starting self-healing bootstrap system', { module: 'self-healing' });
    
    // Initial health check
    await this.performHealthCheck();
    
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop the self-healing process
   */
  stopSelfHealing(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Self-healing bootstrap stopped', { module: 'self-healing' });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<BootstrapStatus> {
    this.lastHealthCheck = Date.now();
    
    const status: BootstrapStatus = {
      isHealthy: false,
      lastSuccessfulBootstrap: localStorage.getItem('last_successful_bootstrap'),
      configSources: {
        urlParams: false,
        localStorage: false,
        staticFile: false,
        environment: false
      },
      errors: [],
      clientInstances: this.countClientInstances()
    };

    try {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      status.configSources.urlParams = !!(
        urlParams.get('supabase_url') || urlParams.get('public_url')
      );

      // Check localStorage
      status.configSources.localStorage = await this.checkLocalStorageConfig();

      // Check static file
      status.configSources.staticFile = await this.checkStaticFileConfig();

      // Check environment variables
      status.configSources.environment = this.checkEnvironmentConfig();

      // Overall health assessment
      status.isHealthy = Object.values(status.configSources).some(Boolean) && 
                       status.clientInstances <= 1;

      if (!status.isHealthy) {
        status.errors.push('No valid configuration sources available');
      }

      if (status.clientInstances > 1) {
        status.errors.push(`Multiple client instances detected: ${status.clientInstances}`);
      }

      logger.info('Health check completed', { 
        module: 'self-healing',
        status: status.isHealthy ? 'healthy' : 'unhealthy',
        sources: status.configSources,
        errors: status.errors
      });

    } catch (error) {
      status.errors.push(error instanceof Error ? error.message : 'Unknown health check error');
      logger.error('Health check failed', error, { module: 'self-healing' });
    }

    return status;
  }

  /**
   * Attempt to heal any detected issues
   */
  async performHealing(): Promise<boolean> {
    logger.info('Starting healing process', { module: 'self-healing' });

    try {
      // Step 1: Try to load any valid configuration
      const configResult = await unifiedConfig.loadConfig();
      
      if (!configResult.success || !configResult.config) {
        logger.warn('No valid configuration found during healing', { module: 'self-healing' });
        return false;
      }

      // Step 2: Test the configuration
      const isValid = await this.testConfiguration(configResult.config);
      if (!isValid) {
        logger.warn('Configuration failed validation during healing', { module: 'self-healing' });
        return false;
      }

      // Step 3: Update static file for future bootstraps
      const staticUpdateSuccess = await this.updateStaticConfiguration(configResult.config);
      if (staticUpdateSuccess) {
        logger.info('Static configuration updated successfully', { module: 'self-healing' });
      }

      // Step 4: Ensure client is properly initialized
      const clientSuccess = await clientManager.initialize(configResult.config);
      if (!clientSuccess) {
        logger.warn('Client initialization failed during healing', { module: 'self-healing' });
        return false;
      }

      // Step 5: Record successful healing
      localStorage.setItem('last_successful_bootstrap', new Date().toISOString());
      localStorage.setItem('healing_attempts', '0');

      logger.info('Healing process completed successfully', { 
        module: 'self-healing',
        source: configResult.source
      });

      return true;

    } catch (error) {
      const attempts = parseInt(localStorage.getItem('healing_attempts') || '0') + 1;
      localStorage.setItem('healing_attempts', attempts.toString());
      
      logger.error('Healing process failed', error, { 
        module: 'self-healing',
        attempts
      });
      
      return false;
    }
  }

  /**
   * Force regenerate static configuration file
   */
  async regenerateStaticConfig(): Promise<boolean> {
    try {
      const configResult = await unifiedConfig.loadConfig();
      
      if (!configResult.success || !configResult.config) {
        throw new Error('No valid configuration to regenerate from');
      }

      return await this.updateStaticConfiguration(configResult.config);
    } catch (error) {
      logger.error('Failed to regenerate static config', error, { module: 'self-healing' });
      return false;
    }
  }

  /**
   * Get current bootstrap status
   */
  async getStatus(): Promise<BootstrapStatus> {
    // Use cached status if recent
    if (Date.now() - this.lastHealthCheck < 30000) { // 30 seconds
      return await this.performHealthCheck();
    }
    
    return await this.performHealthCheck();
  }

  private async checkLocalStorageConfig(): Promise<boolean> {
    try {
      const result = await unifiedConfig.loadConfig();
      return result.success && result.source === 'local-storage';
    } catch {
      return false;
    }
  }

  private async checkStaticFileConfig(): Promise<boolean> {
    try {
      const response = await fetch('/site-config.json', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) return false;
      
      const config = await response.json();
      return !!(config.supabaseUrl && config.supabaseAnonKey);
    } catch {
      return false;
    }
  }

  private checkEnvironmentConfig(): boolean {
    return !!(
      import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  private async testConfiguration(config: SupabaseConfig): Promise<boolean> {
    try {
      const test = await testSupabaseConnection(config.url, config.anonKey);
      return test.isConnected;
    } catch {
      return false;
    }
  }

  private async updateStaticConfiguration(config: SupabaseConfig): Promise<boolean> {
    try {
      const siteConfig = createSiteConfig(config.url, config.anonKey);
      return await updateStaticSiteConfig(siteConfig);
    } catch (error) {
      logger.error('Failed to update static configuration', error, { module: 'self-healing' });
      return false;
    }
  }

  private countClientInstances(): number {
    // Count GoTrueClient instances in global scope
    let count = 0;
    
    // Check for multiple client instances in various ways
    if (typeof window !== 'undefined') {
      // Count localStorage keys that suggest multiple clients
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') && key.includes('auth')
      );
      
      // Estimate based on auth keys (rough heuristic)
      count = Math.max(1, Math.floor(authKeys.length / 3));
    }
    
    return count;
  }
}

// Export singleton instance
export const selfHealingBootstrap = SelfHealingBootstrap.getInstance();
