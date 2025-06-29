
import { logger } from '@/utils/logging';
import { configLoader } from './config-loader';
import { ConfigSource } from './config-loader-types';
import { resetSupabaseClient, getSupabaseClient, shouldBypassRedirect } from './connection-service';
import { getEnvironmentInfo } from '@/config/supabase/environment';
import { clearConfig } from '@/config/supabase-config';
import { isValidUrl } from './config-validation';

export enum BootstrapState {
  INITIAL = 'initial',
  LOADING = 'loading',
  CONFIG_FOUND = 'config_found',
  CONFIG_MISSING = 'config_missing',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_SUCCESS = 'connection_success',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  DATABASE = 'database',
  CONFIG = 'config',
  UNKNOWN = 'unknown'
}

export interface BootstrapContext {
  state: BootstrapState;
  error?: string;
  errorType?: ErrorType;
  configSource?: ConfigSource;
  retryCount: number;
  lastAttempt: string;
  lastSuccess?: string;
  environment: string;
}

const BOOTSTRAP_STATE_KEY = 'supabase_bootstrap_state';

// Bootstrap Context Management
class BootstrapContextManager {
  private static isLocalStorageAvailable(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  static createDefaultContext(): BootstrapContext {
    return {
      state: BootstrapState.INITIAL,
      retryCount: 0,
      lastAttempt: new Date().toISOString(),
      environment: getEnvironmentInfo().id
    };
  }

  static saveContext(ctx: BootstrapContext): void {
    if (!this.isLocalStorageAvailable()) {
      logger.warn('localStorage not available for saving context', { module: 'bootstrap-state-machine' });
      return;
    }

    try {
      localStorage.setItem(BOOTSTRAP_STATE_KEY, JSON.stringify(ctx));
    } catch (e) {
      logger.error('Error saving bootstrap context', e, { module: 'bootstrap-state-machine' });
    }
  }

  static loadContext(): BootstrapContext {
    if (!this.isLocalStorageAvailable()) {
      logger.warn('localStorage not available', { module: 'bootstrap-state-machine' });
      return this.createDefaultContext();
    }

    if (shouldBypassRedirect(window.location.pathname)) {
      logger.info('Bypass route, using default context', { module: 'bootstrap-state-machine' });
      return this.createDefaultContext();
    }

    try {
      const saved = localStorage.getItem(BOOTSTRAP_STATE_KEY);
      if (!saved) {
        logger.info('No saved context, creating new', { module: 'bootstrap-state-machine' });
        return this.createDefaultContext();
      }

      const parsed = JSON.parse(saved) as BootstrapContext;
      
      // Check if context is expired (1 hour)
      const isExpired = (Date.now() - new Date(parsed.lastAttempt).getTime()) / 3600000 > 1;
      if (isExpired) {
        logger.info('Context expired, creating new context', { module: 'bootstrap-state-machine' });
        return this.createDefaultContext();
      }

      // Reset state to INITIAL on load to ensure fresh bootstrap
      return { ...parsed, state: BootstrapState.INITIAL };
    } catch (e) {
      logger.error('Failed to parse bootstrap context', e, { module: 'bootstrap-state-machine' });
      return this.createDefaultContext();
    }
  }

  static clearContext(): void {
    if (!this.isLocalStorageAvailable()) return;
    
    try {
      localStorage.removeItem(BOOTSTRAP_STATE_KEY);
    } catch (e) {
      logger.error('Error clearing bootstrap context', e, { module: 'bootstrap-state-machine' });
    }
  }
}

// Error Type Detection
class ErrorAnalyzer {
  private static readonly ERROR_PATTERNS = {
    [ErrorType.CONFIG]: [
      /invalid|malformed.*url|format/i,
      /url format/i,
      /invalid format/i,
      /config|settings|initialization/i
    ],
    [ErrorType.NETWORK]: [
      /network|fetch|connection|timeout|cors/i
    ],
    [ErrorType.AUTH]: [
      /auth|unauthorized|permission|forbidden|credentials/i
    ],
    [ErrorType.DATABASE]: [
      /database|table|sql|query|schema/i
    ]
  };

  static determineErrorType(error: string): ErrorType {
    if (!error) return ErrorType.UNKNOWN;
    
    const errorLower = error.toLowerCase();
    
    for (const [errorType, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(errorLower))) {
        return errorType as ErrorType;
      }
    }
    
    return ErrorType.UNKNOWN;
  }
}

// State Transition Manager
class StateTransitionManager {
  static transitionTo(
    ctx: BootstrapContext,
    state: BootstrapState,
    onChange: (c: BootstrapContext) => void,
    updates: Partial<BootstrapContext> = {}
  ): BootstrapContext {
    const nextContext = { 
      ...ctx, 
      state, 
      ...updates 
    };
    
    BootstrapContextManager.saveContext(nextContext);
    onChange(nextContext);
    return nextContext;
  }
}

// Configuration Validator
class ConfigValidator {
  static validateConfigData(config: any, source: ConfigSource): { isValid: boolean; error?: string } {
    if (!config || !config.url || !config.anonKey) {
      return { isValid: false, error: 'Configuration missing required fields' };
    }

    if (!config.url.trim() || !config.anonKey.trim()) {
      return { isValid: false, error: 'Configuration has empty values' };
    }

    if (!isValidUrl(config.url)) {
      return { isValid: false, error: 'Invalid URL format' };
    }

    return { isValid: true };
  }
}

// Client Initialization Manager
class ClientInitializationManager {
  static async initializeClientWithRetry(): Promise<void> {
    const MAX_ATTEMPTS = 3;
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Wait before retry (progressive delay)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }

        const client = await getSupabaseClient();
        
        if (!client?.auth?.getSession || typeof client.from !== 'function') {
          if (attempt < MAX_ATTEMPTS) continue;
          throw new Error('Client not properly initialized');
        }

        // Test auth session
        const { error } = await client.auth.getSession();
        if (error && attempt < MAX_ATTEMPTS) continue;

        // Test database access
        try {
          client.from('profiles');
        } catch (e) {
          if (attempt < MAX_ATTEMPTS) continue;
          throw e;
        }

        // Success - client is ready
        return;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
  }
}

// Main Bootstrap Executor
export async function executeBootstrap(
  ctx: BootstrapContext, 
  onChange: (c: BootstrapContext) => void
): Promise<BootstrapContext> {
  const pathname = window.location.pathname;
  
  // Check for bypass routes
  if (shouldBypassRedirect(pathname)) {
    logger.info('Bypassing bootstrap for route', { module: 'bootstrap-state-machine', route: pathname });
    return StateTransitionManager.transitionTo(
      ctx, 
      BootstrapState.CONFIG_MISSING, 
      onChange,
      { 
        error: `Bootstrap bypassed on route ${pathname}`, 
        errorType: ErrorType.CONFIG 
      }
    );
  }

  // Start loading phase
  const loadingCtx = StateTransitionManager.transitionTo(
    ctx, 
    BootstrapState.LOADING, 
    onChange, 
    { lastAttempt: new Date().toISOString() }
  );

  logger.info('Starting bootstrap execution', { 
    module: 'bootstrap-state-machine', 
    retryCount: loadingCtx.retryCount, 
    environment: loadingCtx.environment 
  });

  try {
    // Load configuration
    const configResult = await configLoader.loadConfiguration();
    const config = configResult.config;

    if (!config) {
      return handleConfigurationError(loadingCtx, onChange, configResult);
    }

    // Validate configuration
    const validation = ConfigValidator.validateConfigData(config, configResult.source);
    if (!validation.isValid) {
      clearConfig();
      return StateTransitionManager.transitionTo(
        loadingCtx, 
        BootstrapState.CONFIG_MISSING, 
        onChange,
        {
          error: validation.error,
          errorType: ErrorType.CONFIG,
          configSource: configResult.source
        }
      );
    }

    // Configuration found and valid
    const configFoundCtx = StateTransitionManager.transitionTo(
      loadingCtx, 
      BootstrapState.CONFIG_FOUND, 
      onChange, 
      { configSource: configResult.source }
    );

    logger.info(`Valid configuration found from ${configResult.source}`, { module: 'bootstrap-state-machine' });

    // Save configuration and reset client
    configLoader.saveConfiguration(config);
    resetSupabaseClient();

    // Initialize client with retry logic
    await ClientInitializationManager.initializeClientWithRetry();

    // Success
    const successCtx = StateTransitionManager.transitionTo(
      configFoundCtx, 
      BootstrapState.CONNECTION_SUCCESS, 
      onChange,
      { 
        lastSuccess: new Date().toISOString(), 
        error: undefined, 
        errorType: undefined 
      }
    );

    // Transition to complete after brief delay
    setTimeout(() => {
      StateTransitionManager.transitionTo(successCtx, BootstrapState.COMPLETE, onChange);
    }, 2000);

    return successCtx;

  } catch (error) {
    return handleBootstrapError(ctx, onChange, error);
  }
}

// Error Handlers
function handleConfigurationError(
  ctx: BootstrapContext,
  onChange: (c: BootstrapContext) => void,
  configResult: any
): BootstrapContext {
  if (configResult.source === ConfigSource.STATIC_FILE) {
    clearConfig();
    logger.info('Static config empty/invalid', { 
      module: 'bootstrap-state-machine', 
      error: configResult.error 
    });
    
    return StateTransitionManager.transitionTo(
      ctx, 
      BootstrapState.CONFIG_MISSING, 
      onChange,
      { 
        error: 'Static site config missing or empty', 
        errorType: ErrorType.CONFIG, 
        configSource: configResult.source 
      }
    );
  }

  logger.warn('No valid config found', { 
    module: 'bootstrap-state-machine', 
    error: configResult.error, 
    source: configResult.source 
  });
  
  return StateTransitionManager.transitionTo(
    ctx, 
    BootstrapState.CONFIG_MISSING, 
    onChange,
    { 
      error: configResult.error || 'No valid config found', 
      errorType: configResult.error ? ErrorAnalyzer.determineErrorType(configResult.error) : ErrorType.CONFIG, 
      retryCount: ctx.retryCount + 1 
    }
  );
}

function handleBootstrapError(
  ctx: BootstrapContext,
  onChange: (c: BootstrapContext) => void,
  error: unknown
): BootstrapContext {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Bootstrap execution failed', error, { module: 'bootstrap-state-machine' });
  
  return StateTransitionManager.transitionTo(
    ctx, 
    BootstrapState.CONNECTION_ERROR, 
    onChange, 
    {
      error: errorMessage, 
      errorType: ErrorAnalyzer.determineErrorType(errorMessage),
      retryCount: ctx.retryCount + 1, 
      lastAttempt: new Date().toISOString()
    }
  );
}

// Public API - Maintaining backwards compatibility
export function initBootstrapContext(): BootstrapContext {
  try {
    return BootstrapContextManager.loadContext();
  } catch (error) {
    logger.error('Error initializing bootstrap context', error, { module: 'bootstrap-state-machine' });
    return BootstrapContextManager.createDefaultContext();
  }
}

export const saveBootstrapContext = BootstrapContextManager.saveContext;
export const clearBootstrapContext = BootstrapContextManager.clearContext;
export const determineErrorType = ErrorAnalyzer.determineErrorType;

export function resetBootstrap(onChange: (c: BootstrapContext) => void): BootstrapContext {
  const ctx = BootstrapContextManager.createDefaultContext();
  BootstrapContextManager.saveContext(ctx);
  onChange(ctx);
  return ctx;
}
