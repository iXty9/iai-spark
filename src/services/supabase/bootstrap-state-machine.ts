/**
 * Bootstrap state machine for managing Supabase connection bootstrap process
 * This provides a more robust approach to handling the bootstrap process
 * with proper state transitions and error handling
 */

import { logger } from '@/utils/logging';
import { configLoader } from './config-loader';
import { ConfigSource } from './config-loader-types';
import { resetSupabaseClient, getSupabaseClient } from './connection-service';
import { getEnvironmentInfo } from '@/config/supabase/environment';

// Bootstrap state machine states
export enum BootstrapState {
  INITIAL = 'initial',
  LOADING = 'loading',
  CONFIG_FOUND = 'config_found',
  CONFIG_MISSING = 'config_missing',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_SUCCESS = 'connection_success',
  COMPLETE = 'complete'
}

// Error types for more specific handling
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  DATABASE = 'database',
  CONFIG = 'config',
  UNKNOWN = 'unknown'
}

// Bootstrap state machine context
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

// Local storage key for bootstrap state
const BOOTSTRAP_STATE_KEY = 'supabase_bootstrap_state';

/**
 * Initialize bootstrap context with default values
 */
export function initBootstrapContext(): BootstrapContext {
  try {
    // Check if localStorage is available first
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      // If localStorage isn't available, return a memory-only context
      logger.warn('localStorage not available for bootstrap context', {
        module: 'bootstrap-state-machine'
      });
      return createDefaultContext();
    }
    
    // Try to load saved state
    const savedState = localStorage.getItem(BOOTSTRAP_STATE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as BootstrapContext;
        
        // Reset to initial state if last attempt was more than 1 hour ago
        const lastAttemptTime = new Date(parsedState.lastAttempt).getTime();
        const now = new Date().getTime();
        const hoursSinceLastAttempt = (now - lastAttemptTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastAttempt > 1) {
          logger.info('Bootstrap context expired, creating new context', {
            module: 'bootstrap-state-machine',
            hoursSinceLastAttempt
          });
          return createDefaultContext();
        }
        
        return {
          ...parsedState,
          state: BootstrapState.INITIAL // Always start from initial state
        };
      } catch (e) {
        // If parsing fails, create a new context
        logger.error('Failed to parse saved bootstrap context', e, {
          module: 'bootstrap-state-machine'
        });
        return createDefaultContext();
      }
    }
    
    // For new users, create a fresh context
    logger.info('No saved bootstrap context found, creating new context', {
      module: 'bootstrap-state-machine'
    });
    return createDefaultContext();
  } catch (error) {
    logger.error('Error initializing bootstrap context', error, {
      module: 'bootstrap-state-machine'
    });
    return createDefaultContext();
  }
}

/**
 * Create default bootstrap context
 */
function createDefaultContext(): BootstrapContext {
  return {
    state: BootstrapState.INITIAL,
    retryCount: 0,
    lastAttempt: new Date().toISOString(),
    environment: getEnvironmentInfo().id
  };
}

/**
 * Save bootstrap context to localStorage
 */
export function saveBootstrapContext(context: BootstrapContext): void {
  try {
    localStorage.setItem(BOOTSTRAP_STATE_KEY, JSON.stringify(context));
  } catch (error) {
    logger.error('Error saving bootstrap context', error, {
      module: 'bootstrap-state-machine'
    });
  }
}

/**
 * Clear bootstrap context from localStorage
 */
export function clearBootstrapContext(): void {
  try {
    localStorage.removeItem(BOOTSTRAP_STATE_KEY);
  } catch (error) {
    logger.error('Error clearing bootstrap context', error, {
      module: 'bootstrap-state-machine'
    });
  }
}

/**
 * Determine error type from error message
 */
export function determineErrorType(error: string): ErrorType {
  if (!error) return ErrorType.UNKNOWN;
  
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('network') || 
      errorLower.includes('fetch') || 
      errorLower.includes('connection') ||
      errorLower.includes('timeout') ||
      errorLower.includes('cors')) {
    return ErrorType.NETWORK;
  }
  
  if (errorLower.includes('auth') || 
      errorLower.includes('unauthorized') || 
      errorLower.includes('permission') ||
      errorLower.includes('forbidden') ||
      errorLower.includes('credentials')) {
    return ErrorType.AUTH;
  }
  
  if (errorLower.includes('database') || 
      errorLower.includes('table') || 
      errorLower.includes('sql') ||
      errorLower.includes('query') ||
      errorLower.includes('schema')) {
    return ErrorType.DATABASE;
  }
  
  if (errorLower.includes('config') || 
      errorLower.includes('settings') || 
      errorLower.includes('initialization')) {
    return ErrorType.CONFIG;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Helper function for state transitions
 */
function transitionTo(
  context: BootstrapContext, 
  newState: BootstrapState,
  onStateChange: (newContext: BootstrapContext) => void,
  additionalProps: Partial<BootstrapContext> = {}
): BootstrapContext {
  const newContext = {
    ...context,
    state: newState,
    ...additionalProps
  };
  
  saveBootstrapContext(newContext);
  onStateChange(newContext);
  
  return newContext;
}

/**
 * Execute bootstrap process
 * This is the main function that drives the bootstrap state machine
 */
export async function executeBootstrap(
  context: BootstrapContext,
  onStateChange: (newContext: BootstrapContext) => void
): Promise<BootstrapContext> {
  try {
    // Update context with current state - transition to LOADING
    const loadingContext = transitionTo(
      context, 
      BootstrapState.LOADING, 
      onStateChange, 
      { lastAttempt: new Date().toISOString() }
    );
    
    logger.info('Starting bootstrap process', {
      module: 'bootstrap-state-machine',
      retryCount: loadingContext.retryCount,
      environment: loadingContext.environment
    });
    
    // Load configuration using the unified loader
    const result = await configLoader.loadConfiguration();
    
    if (result.config && result.config.url && result.config.anonKey) {
      // Verify config has non-empty values for required fields
      if (!result.config.url.trim() || !result.config.anonKey.trim()) {
        logger.warn('Bootstrap found empty configuration values', {
          module: 'bootstrap-state-machine',
          source: result.source,
          hasUrl: !!result.config.url,
          hasAnonKey: !!result.config.anonKey
        });
        
        // Handle as CONFIG_MISSING case when values are empty
        const errorContext = transitionTo(
          loadingContext,
          BootstrapState.CONFIG_MISSING,
          onStateChange,
          {
            error: 'Configuration found but contains empty values',
            errorType: ErrorType.CONFIG,
            configSource: result.source
          }
        );
        
        return errorContext;
      }
      
      // Configuration found with valid values - transition to CONFIG_FOUND
      const configFoundContext = transitionTo(
        loadingContext,
        BootstrapState.CONFIG_FOUND,
        onStateChange,
        { configSource: result.source }
      );
      
      logger.info(`Bootstrap found configuration from ${result.source}`, {
        module: 'bootstrap-state-machine'
      });
      
      // Save configuration
      configLoader.saveConfiguration(result.config);
      
      // Reset Supabase client to use new configuration
      resetSupabaseClient();
      
      // Force a new client initialization after a short delay
      // Use multiple retries with increasing delays
      const retryClientInit = async (attempt = 1, maxAttempts = 3) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          
          // Use dynamic import instead of require
          const { getSupabaseClient } = await import('./connection-service');
          const client = getSupabaseClient();
          
          if (client) {
            logger.info(`Bootstrap forced client initialization: success on attempt ${attempt}`, {
              module: 'bootstrap-state-machine'
            });
          } else if (attempt < maxAttempts) {
            logger.warn(`Bootstrap forced client initialization failed, retry ${attempt}/${maxAttempts}`, {
              module: 'bootstrap-state-machine'
            });
            await retryClientInit(attempt + 1, maxAttempts);
          } else {
            logger.error(`Bootstrap forced client initialization failed after ${maxAttempts} attempts`, {
              module: 'bootstrap-state-machine'
            });
          }
        } catch (error) {
          logger.error('Error during client initialization retry', error, {
            module: 'bootstrap-state-machine',
            retryAttempt: attempt
          });
        }
      };
      
      // Start the retry process
      retryClientInit();
      
      // Transition to CONNECTION_SUCCESS
      const successContext = transitionTo(
        configFoundContext,
        BootstrapState.CONNECTION_SUCCESS,
        onStateChange,
        {
          lastSuccess: new Date().toISOString(),
          error: undefined,
          errorType: undefined
        }
      );
      
      // Transition to complete state after a delay
      setTimeout(() => {
        transitionTo(
          successContext,
          BootstrapState.COMPLETE,
          onStateChange
        );
      }, 2000);
      
      return successContext;
    } else {
      // No configuration found or invalid configuration - transition to appropriate error state
      logger.warn('No valid configuration found during bootstrap', {
        module: 'bootstrap-state-machine',
        error: result.error,
        hasConfig: !!result.config,
        configSourceIfFound: result.source
      });
      
      // Determine error type if error exists
      const errorType = result.error 
        ? determineErrorType(result.error)
        : ErrorType.CONFIG;
      
      // Transition to appropriate error state
      const errorState = result.error 
        ? BootstrapState.CONNECTION_ERROR 
        : BootstrapState.CONFIG_MISSING;
      
      const errorContext = transitionTo(
        loadingContext,
        errorState,
        onStateChange,
        {
          error: result.error || 'No valid configuration found',
          errorType,
          retryCount: loadingContext.retryCount + 1
        }
      );
      
      return errorContext;
    }
  } catch (error) {
    // Unexpected error - transition to CONNECTION_ERROR
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected error during bootstrap:', error, {
      module: 'bootstrap-state-machine'
    });
    
    // Transition to error state
    const errorContext = transitionTo(
      context,
      BootstrapState.CONNECTION_ERROR,
      onStateChange,
      {
        error: errorMsg,
        errorType: determineErrorType(errorMsg),
        retryCount: context.retryCount + 1,
        lastAttempt: new Date().toISOString()
      }
    );
    
    return errorContext;
  }
}

/**
 * Reset bootstrap state machine
 * This is useful when forcing a new bootstrap attempt
 */
export function resetBootstrap(
  onStateChange: (newContext: BootstrapContext) => void
): BootstrapContext {
  // Create new context with default values
  const newContext = createDefaultContext();
  
  // Save and notify of state change
  saveBootstrapContext(newContext);
  onStateChange(newContext);
  
  return newContext;
}
