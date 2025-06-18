
import { emitDebugEvent } from '../debug-events';
import { logger } from '../logging';
import { globalStateService } from '@/services/debug/global-state-service';

/**
 * Supabase connection and bootstrap debugging utilities
 */

// Function to emit Supabase connection status events
export function emitSupabaseConnectionEvent(status: string, error: string | null = null) {
  if (typeof window === 'undefined') return;
  
  const timestamp = new Date().toISOString();
  const connectionLatency = status === 'connected' ? 
    performance.now() - (window.supabaseConnectionStartTime || 0) : null;
  
  let environment = parseEnv(localStorage.getItem('supabase_environment_local')) ||
    (window.location.hostname === 'localhost' ? 'development' : 'production');
  
  window.dispatchEvent(new CustomEvent('supabaseConnection', { 
    detail: { status, error, timestamp, connectionLatency, environment } 
  }));
  
  globalStateService.updateNestedState('supabaseInfo', {
    connectionStatus: status,
    lastConnectionAttempt: timestamp,
    connectionLatency,
    lastError: error,
    environment,
    retryCount: globalStateService.getDebugState().supabaseInfo.retryCount + (status === 'connecting' ? 1 : 0),
    isInitialized: status === 'connected'
  });
  
  logger.info(`Supabase connection: ${status}${error ? ` (Error: ${error})` : ''}`, null, { module: 'supabase-connection' });
}

// Function to emit bootstrap process events
export function emitBootstrapEvent(stage: string, error: string | null = null) {
  if (typeof window === 'undefined') return;
  
  const timestamp = new Date().toISOString();
  window.bootstrapStartTime ??= timestamp;
  
  const step = { step: stage, status: error ? 'error' : 'success', timestamp, error };
  window.dispatchEvent(new CustomEvent('bootstrapProcess', { 
    detail: { stage, error, timestamp, step } 
  }));
  
  const currentInfo = globalStateService.getDebugState().bootstrapInfo;
  const steps = [...currentInfo.steps, step];
  
  globalStateService.updateNestedState('bootstrapInfo', {
    stage,
    startTime: window.bootstrapStartTime,
    completionTime: stage === 'completed' ? timestamp : currentInfo.completionTime,
    steps,
    lastError: error || currentInfo.lastError
  });
  
  logger.info(`Bootstrap process: ${stage}${error ? ` (Error: ${error})` : ''}`, null, { module: 'bootstrap' });
  
  try { 
    localStorage.setItem('supabase_bootstrap_state', JSON.stringify({ stage, timestamp, error: error || null })); 
  } catch (e) {
    logger.warn('Failed to save bootstrap state', e, { module: 'bootstrap' });
  }
}

function parseEnv(env: string | null) {
  if (!env) return null;
  if (env.startsWith('{') && env.endsWith('}')) {
    try { 
      return JSON.parse(env).id || JSON.parse(env).type || 'unknown'; 
    } catch { 
      return env; 
    }
  }
  return env;
}
