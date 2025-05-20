
/**
 * Bootstrap manager for Supabase initialization
 * Provides a centralized way to manage bootstrap state
 */

import { eventBus, AppEvents } from '@/utils/event-bus';
import { isTabVisible } from '@/utils/visibility-tracker';
import { logger } from '@/utils/logging';
import { 
  BootstrapState, 
  ErrorType, 
  BootstrapContext,
  createInitialContext,
  determineErrorType
} from './bootstrap-states';
import { getEnvironmentInfo } from '@/config/supabase/environment';
import { configLoader } from '../config-loader';
import { ConfigSource } from '../config-loader-types';
import { clearConfig } from '@/config/supabase-config';
import { isValidUrl } from '../config-validation';

// Bootstrap context storage
const BOOTSTRAP_STATE_KEY = 'supabase_bootstrap_state';
const BOOTSTRAP_LOCK_KEY = 'supabase_bootstrap_lock';
const MAX_LOCK_DURATION_MS = 10000; // 10 seconds

class BootstrapManager {
  private context: BootstrapContext;
  private isBootstrapping: boolean = false;
  private lockAcquired: boolean = false;
  private lockTimeout: number | null = null;
  
  /**
   * Create a new bootstrap manager
   */
  constructor() {
    // Initialize with saved state or create new
    this.context = this.loadStoredContext() || createInitialContext(getEnvironmentInfo().id);
    
    // Listen for visibility changes to optimize bootstrapping
    eventBus.subscribe(AppEvents.TAB_VISIBLE, () => {
      // When tab becomes visible, check if we need to bootstrap
      if (this.context.state !== BootstrapState.COMPLETE && 
          this.context.state !== BootstrapState.CONNECTION_SUCCESS) {
        this.startBootstrap();
      }
    });
  }
  
  /**
   * Load stored bootstrap context from localStorage
   */
  private loadStoredContext(): BootstrapContext | null {
    try {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch {
        logger.warn('localStorage not available', { module: 'bootstrap-manager' });
        return null;
      }
      
      const saved = localStorage.getItem(BOOTSTRAP_STATE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as BootstrapContext;
          // Check if context is recent (less than 1 hour old)
          if ((Date.now() - new Date(parsed.lastAttempt).getTime()) / 36e5 <= 1) {
            // Reset to initial state to trigger a new bootstrap
            parsed.state = BootstrapState.INITIAL;
            return parsed;
          }
          
          logger.info('Context expired, creating new', { module: 'bootstrap-manager' });
          return createInitialContext(getEnvironmentInfo().id);
        } catch (e) {
          logger.error('Failed to parse bootstrap context', e, { module: 'bootstrap-manager' });
          return null;
        }
      }
      
      logger.info('No saved context, creating new', { module: 'bootstrap-manager' });
      return null;
    } catch (e) {
      logger.error('Error loading bootstrap context', e, { module: 'bootstrap-manager' });
      return null;
    }
  }
  
  /**
   * Save bootstrap context to localStorage
   */
  private saveContext(): void {
    try {
      localStorage.setItem(BOOTSTRAP_STATE_KEY, JSON.stringify(this.context));
    } catch (e) {
      logger.error('Error saving bootstrap context', e, { module: 'bootstrap-manager' });
    }
  }
  
  /**
   * Acquire a lock to prevent concurrent bootstrapping
   */
  private acquireLock(): boolean {
    if (this.lockAcquired) return true;
    
    try {
      const lockTime = localStorage.getItem(BOOTSTRAP_LOCK_KEY);
      
      // Check if lock exists and is recent
      if (lockTime && (Date.now() - Number(lockTime)) < MAX_LOCK_DURATION_MS) {
        logger.debug('Bootstrap lock already acquired by another instance', { module: 'bootstrap-manager' });
        return false;
      }
      
      // Set lock
      localStorage.setItem(BOOTSTRAP_LOCK_KEY, Date.now().toString());
      this.lockAcquired = true;
      
      // Set timeout to release lock
      this.lockTimeout = window.setTimeout(() => {
        this.releaseLock();
      }, MAX_LOCK_DURATION_MS);
      
      return true;
    } catch (e) {
      logger.error('Error acquiring bootstrap lock', e, { module: 'bootstrap-manager' });
      return false;
    }
  }
  
  /**
   * Release the bootstrap lock
   */
  private releaseLock(): void {
    try {
      localStorage.removeItem(BOOTSTRAP_LOCK_KEY);
      this.lockAcquired = false;
      
      if (this.lockTimeout !== null) {
        window.clearTimeout(this.lockTimeout);
        this.lockTimeout = null;
      }
    } catch (e) {
      logger.error('Error releasing bootstrap lock', e, { module: 'bootstrap-manager' });
    }
  }
  
  /**
   * Transition to a new bootstrap state
   */
  private transition(state: BootstrapState, extras: Partial<BootstrapContext> = {}): void {
    // Update context
    this.context = {
      ...this.context,
      state,
      ...extras
    };
    
    // Save context
    this.saveContext();
    
    // Emit event
    eventBus.publish(AppEvents.BOOTSTRAP_STARTED + ':' + state, this.context);
    
    // Log transition
    logger.info(`Bootstrap state transition to ${state}`, { 
      module: 'bootstrap-manager',
      state,
      ...extras
    });
    
    // Special handling for completion state
    if (state === BootstrapState.COMPLETE || state === BootstrapState.CONNECTION_SUCCESS) {
      eventBus.publish(AppEvents.BOOTSTRAP_COMPLETED, this.context);
    } else if (state === BootstrapState.CONNECTION_ERROR || state === BootstrapState.CONFIG_MISSING) {
      eventBus.publish(AppEvents.BOOTSTRAP_FAILED, this.context);
    }
  }
  
  /**
   * Check if current route should bypass redirect
   */
  private shouldBypassBootstrap(): boolean {
    // These routes should never be redirected away from, even if config is missing
    const NON_REDIRECTABLE_ROUTES = [
      '/supabase-auth',
      '/initialize',
      '/admin/connection'
    ];
    
    const pathname = window.location.pathname;
    return NON_REDIRECTABLE_ROUTES.some(route => pathname.startsWith(route));
  }
  
  /**
   * Start the bootstrap process
   */
  async startBootstrap(): Promise<void> {
    // Skip if tab is not visible
    if (!isTabVisible()) {
      logger.info('Skipping bootstrap as tab is not visible', { module: 'bootstrap-manager' });
      return;
    }
    
    // Skip if already bootstrapping
    if (this.isBootstrapping) {
      logger.debug('Bootstrap already in progress', { module: 'bootstrap-manager' });
      return;
    }
    
    // Skip if we should bypass bootstrap
    if (this.shouldBypassBootstrap()) {
      logger.info('Bypassing bootstrap due to route', { 
        module: 'bootstrap-manager',
        route: window.location.pathname
      });
      
      this.transition(
        BootstrapState.CONFIG_MISSING, 
        { 
          error: `Bootstrap bypassed on route ${window.location.pathname}`,
          errorType: ErrorType.CONFIG
        }
      );
      return;
    }
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset_config') === 'true') {
      clearConfig();
      this.context = createInitialContext(getEnvironmentInfo().id);
      this.saveContext();
      
      // Reload page without reset_config parameter
      window.location.href = window.location.pathname + '?config_cleared=true';
      return;
    }
    
    // Acquire lock
    if (!this.acquireLock()) {
      logger.info('Could not acquire bootstrap lock', { module: 'bootstrap-manager' });
      return;
    }
    
    try {
      // Mark as bootstrapping
      this.isBootstrapping = true;
      
      // Transition to loading state
      this.transition(BootstrapState.LOADING, { lastAttempt: new Date().toISOString() });
      
      // Load configuration
      const configResult = await configLoader.loadConfiguration();
      const config = configResult.config;
      
      if (config && config.url && config.anonKey) {
        // Check if values are empty
        if (!config.url.trim() || !config.anonKey.trim()) {
          logger.warn('Empty config values', { 
            module: 'bootstrap-manager',
            source: configResult.source
          });
          
          clearConfig();
          
          this.transition(BootstrapState.CONFIG_MISSING, {
            error: 'Configuration has empty values',
            errorType: ErrorType.CONFIG,
            configSource: configResult.source
          });
          
          return;
        }
        
        // Check URL format
        if (!isValidUrl(config.url)) {
          logger.warn('Invalid URL format', { 
            module: 'bootstrap-manager',
            source: configResult.source,
            url: config.url
          });
          
          clearConfig();
          
          this.transition(BootstrapState.CONFIG_MISSING, {
            error: 'Invalid URL format',
            errorType: ErrorType.CONFIG,
            configSource: configResult.source
          });
          
          return;
        }
        
        // Transition to config found state
        this.transition(BootstrapState.CONFIG_FOUND, { 
          configSource: configResult.source 
        });
        
        // Save configuration
        configLoader.saveConfiguration(config);
        
        // Publish connection success event
        this.transition(BootstrapState.CONNECTION_SUCCESS, {
          lastSuccess: new Date().toISOString(),
          error: undefined,
          errorType: undefined
        });
        
        // Transition to complete state after a delay
        setTimeout(() => {
          this.transition(BootstrapState.COMPLETE);
        }, 2000);
        
        return;
      }
      
      // Handle case where config is missing
      if (configResult.source === ConfigSource.STATIC_FILE) {
        clearConfig();
        
        logger.info('Static config empty/invalid', { 
          module: 'bootstrap-manager',
          error: configResult.error
        });
        
        this.transition(BootstrapState.CONFIG_MISSING, {
          error: 'Static site config missing or empty',
          errorType: ErrorType.CONFIG,
          configSource: configResult.source
        });
        
        return;
      }
      
      // No valid configuration found
      logger.warn('No valid config found', { 
        module: 'bootstrap-manager',
        error: configResult.error,
        hasConfig: !!config,
        configSourceIfFound: configResult.source
      });
      
      this.transition(BootstrapState.CONFIG_MISSING, {
        error: configResult.error || 'No valid config found',
        errorType: configResult.error ? determineErrorType(configResult.error) : ErrorType.CONFIG,
        retryCount: this.context.retryCount + 1
      });
    } catch (err) {
      // Handle unexpected errors
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      logger.error('Unexpected error during bootstrap:', err, { module: 'bootstrap-manager' });
      
      this.transition(BootstrapState.CONNECTION_ERROR, {
        error: errorMsg,
        errorType: determineErrorType(errorMsg),
        retryCount: this.context.retryCount + 1,
        lastAttempt: new Date().toISOString()
      });
    } finally {
      // Always clean up
      this.isBootstrapping = false;
      this.releaseLock();
    }
  }
  
  /**
   * Get current bootstrap context
   */
  getContext(): BootstrapContext {
    return { ...this.context };
  }
  
  /**
   * Reset bootstrap state
   */
  reset(): void {
    this.context = createInitialContext(getEnvironmentInfo().id);
    this.saveContext();
    this.releaseLock();
    eventBus.publish(AppEvents.BOOTSTRAP_STARTED, this.context);
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    this.releaseLock();
    
    if (this.lockTimeout !== null) {
      window.clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }
}

// Export singleton instance
export const bootstrapManager = new BootstrapManager();

// Clean up on app unmount
eventBus.subscribe(AppEvents.APP_UNMOUNTED, () => bootstrapManager.cleanup());
