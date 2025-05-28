import { emitDebugEvent } from './debug-events';
import { logger } from './logging';
import { sendDebugWebhookMessage } from '@/services/webhook';

/**
 * Utility functions for debug information collection and reporting
 */

function parseEnv(env: string | null) {
  if (!env) return null;
  if (env.startsWith('{') && env.endsWith('}')) {
    try { return JSON.parse(env).id || JSON.parse(env).type || 'unknown'; }
    catch { return env; }
  }
  return env;
}

function updateDebugState(key: string, data: any) {
  if (typeof (window as any).debugState !== 'undefined') {
    (window as any).debugState[key] = { ...(window as any).debugState[key], ...data };
  }
}

// Function to emit Supabase connection status events
export function emitSupabaseConnectionEvent(status: string, error: string | null = null) {
  if (typeof window === 'undefined') return;
  const timestamp = new Date().toISOString();
  const connectionLatency = status === 'connected' ? performance.now() - ((window as any).supabaseConnectionStartTime || 0) : null;
  let environment = parseEnv(localStorage.getItem('supabase_environment_local')) ||
    (window.location.hostname === 'localhost' ? 'development' : 'production');
  window.dispatchEvent(new CustomEvent('supabaseConnection', { detail: { status, error, timestamp, connectionLatency, environment } }));
  updateDebugState('supabaseInfo', {
    connectionStatus: status,
    lastConnectionAttempt: timestamp,
    connectionLatency,
    lastError: error,
    environment,
    retryCount: ((window as any).debugState?.supabaseInfo?.retryCount || 0) + (status === 'connecting' ? 1 : 0),
    isInitialized: status === 'connected'
  });
  console.info(`Supabase connection: ${status}${error ? ` (Error: ${error})` : ''}`);
}

// Function to emit bootstrap process events
export function emitBootstrapEvent(stage: string, error: string | null = null) {
  if (typeof window === 'undefined') return;
  const timestamp = new Date().toISOString();
  (window as any).bootstrapStartTime ??= timestamp;
  const step = { step: stage, status: error ? 'error' : 'success', timestamp, error };
  window.dispatchEvent(new CustomEvent('bootstrapProcess', { detail: { stage, error, timestamp, step } }));
  const currentInfo = (window as any).debugState?.bootstrapInfo || {};
  const steps = [...(currentInfo.steps || []), step];
  updateDebugState('bootstrapInfo', {
    stage,
    startTime: (window as any).bootstrapStartTime,
    completionTime: stage === 'completed' ? timestamp : currentInfo.completionTime,
    steps,
    lastError: error || currentInfo.lastError
  });
  console.info(`Bootstrap process: ${stage}${error ? ` (Error: ${error})` : ''}`);
  try { localStorage.setItem('supabase_bootstrap_state', JSON.stringify({ stage, timestamp, error: error || null })); } catch {}
}

// Function to collect and emit environment information
export function collectEnvironmentInfo() {
  if (typeof window !== 'undefined') {
    const publicVars: Record<string, string> = {};
    
    // Safely collect public environment variables
    if (typeof process !== 'undefined' && process.env) {
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('REACT_APP_')) {
          const value = process.env[key] as string;
          // Sanitize sensitive values
          publicVars[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') ? 
            `${value?.substring(0, 3)}...${value?.substring(value.length - 3)}` : 
            value;
        }
      });
    }
    
    // Determine environment type from multiple sources
    // 1. Check localStorage for stored environment
    // 2. Check hostname (localhost = development)
    // 3. Check process.env.NODE_ENV
    // 4. Default to "unknown"
    let storedEnv = localStorage.getItem('supabase_environment_local');
    
    // Make sure we're not using a JSON string
    if (storedEnv && storedEnv.startsWith('{') && storedEnv.endsWith('}')) {
      try {
        const envObj = JSON.parse(storedEnv);
        storedEnv = envObj.id || envObj.type || null;
      } catch (e) {
        // If parsing fails, use null
        console.warn('Failed to parse environment string', e);
        storedEnv = null;
      }
    }
    const hostnameEnv = window.location.hostname === 'localhost' ? 'development' : 
                        window.location.hostname.includes('staging') ? 'staging' :
                        window.location.hostname.includes('dev') ? 'development' :
                        window.location.hostname.includes('test') ? 'testing' :
                        'production';
    const processEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : null;
    
    const envType = storedEnv || hostnameEnv || processEnv || 'unknown';
    const isDevelopment = envType === 'development' || window.location.hostname === 'localhost';
    const isProduction = envType === 'production' && window.location.hostname !== 'localhost';
    
    // Store the determined environment for future reference
    try {
      localStorage.setItem('supabase_environment_local', envType);
    } catch (e) {
      // Ignore storage errors
    }
    
    // Add build information if available
    const buildInfo = {
      version: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_VERSION ? 
        process.env.NEXT_PUBLIC_APP_VERSION : 'unknown',
      buildDate: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_DATE ? 
        process.env.NEXT_PUBLIC_BUILD_DATE : 'unknown',
      commitHash: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COMMIT_HASH ? 
        process.env.NEXT_PUBLIC_COMMIT_HASH : 'unknown'
    };
    
    // Dispatch the environment information event
    window.dispatchEvent(new CustomEvent('chatDebug', { 
      detail: { 
        environmentInfo: {
          type: envType,
          isDevelopment,
          isProduction,
          publicVars,
          buildInfo
        }
      }
    }));
    
    // Also update the global debug state directly
    if (typeof (window as any).debugState !== 'undefined') {
      (window as any).debugState.environmentInfo = {
        type: envType,
        isDevelopment,
        isProduction,
        publicVars,
        buildInfo
      };
    }
    
    // Log environment information
    console.info(`Environment: ${envType} (isDev: ${isDevelopment}, isProd: ${isProduction})`);
  }
}

/**
 * Parse webhook response to get the actual content
 * Handles different response formats from the webhook
 */
export const parseWebhookResponse = (data: any): string => {
  try {
    // Log just once on first parse attempt
    const parseAttemptLogged = sessionStorage.getItem('webhook-parse-logged');
    if (!parseAttemptLogged && process.env.NODE_ENV === 'development') {
      logger.debug('Parsing webhook response', data, { once: true, module: 'webhook' });
      sessionStorage.setItem('webhook-parse-logged', 'true');
    }
    
    // Case 1: Array with text field (anonymous users)
    if (Array.isArray(data) && data.length > 0 && data[0].text) {
      return data[0].text;
    }
    
    // Case 2: Array with output field (authenticated users)
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      return data[0].output;
    }
    
    // Case 3: Direct object with text field
    if (data && typeof data === 'object' && data.text) {
      return data.text;
    }
    
    // Case 4: Direct object with output field
    if (data && typeof data === 'object' && data.output) {
      return data.output;
    }
    
    // Case 5: Direct string
    if (typeof data === 'string') {
      return data;
    }
    
    // Fallback: Try to extract any meaningful text content
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      // Look for any property that might contain the message
      const possibleKeys = ['content', 'message', 'response'];
      for (const key of possibleKeys) {
        if (firstItem[key] && typeof firstItem[key] === 'string') {
          return firstItem[key];
        }
      }
    }
    
    // If we can't parse it, log the error once and throw
    logger.error('Could not parse webhook response - unknown format', data, { module: 'webhook' });
    throw new Error('Unknown response format');
  } catch (error) {
    logger.error('Error parsing webhook response', error, { module: 'webhook' });
    throw error;
  }
};

/**
 * Simple debug info logger - cleanly separated from business logic
 */
export const logWebhookActivity = (url: string, status: string, data?: any) => {
  const webhookType = url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS';
  const message = `${status} - ${webhookType} WEBHOOK`;
  
  emitDebugEvent({
    lastAction: message,
    lastError: status === 'ERROR' ? 'Webhook communication failed' : null
  });
  
  // Only log errors and completions to avoid noise
  if (status === 'ERROR') {
    logger.error(`Webhook ${status}`, { webhookType, error: data }, { module: 'webhook' });
  } else if (status === 'RESPONSE_RECEIVED') {
    logger.info(`Webhook response received`, { webhookType }, { module: 'webhook', throttle: true });
  }
  
  // Return the webhook information (no logging)
  return {
    webhook: webhookType,
    url: url,
    status: status
  };
};

/**
 * Track authentication state changes for debugging
 */
export function trackAuthStateChange(isAuthenticated: boolean, userId?: string | null) {
  if (typeof window !== 'undefined') {
    const authStatus = isAuthenticated ? 'authenticated' : 'unauthenticated';
    
    // Update the global debug state
    if (typeof (window as any).debugState !== 'undefined') {
      const currentInfo = (window as any).debugState.supabaseInfo || {};
      
      (window as any).debugState.supabaseInfo = {
        ...currentInfo,
        authStatus,
        userId: userId || null,
        lastAuthChange: new Date().toISOString()
      };
    }
    
    // Dispatch an event for the debug panel to capture
    window.dispatchEvent(new CustomEvent('chatDebug', { 
      detail: { 
        supabaseInfo: {
          authStatus,
          userId: userId || null,
          lastAuthChange: new Date().toISOString()
        }
      }
    }));
    
    // Log the auth state change
    console.info(`Auth state changed: ${authStatus}${userId ? ` (User: ${userId})` : ''}`);
  }
}

/**
 * Send debug information to webhook - only when DevMode is enabled
 * This is completely separate from the business logic
 */
export const sendDebugInfo = async (debugInfo: any) => {
  try {
    const result = await sendDebugWebhookMessage(debugInfo);
    return { success: !result.error };
  } catch (error) {
    return { success: false, error };
  }
};
