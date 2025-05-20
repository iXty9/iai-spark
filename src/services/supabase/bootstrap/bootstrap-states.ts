
/**
 * Bootstrap state definitions
 */

export enum BootstrapState {
  INITIAL = 'initial',
  LOADING = 'loading',
  CONFIG_FOUND = 'config_found',
  CONFIG_MISSING = 'config_missing',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_SUCCESS = 'connection_success',
  COMPLETE = 'complete'
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
  configSource?: string;
  retryCount: number;
  lastAttempt: string;
  lastSuccess?: string;
  environment: string;
}

export const determineErrorType = (error: string): ErrorType => {
  if (!error) return ErrorType.UNKNOWN;
  const e = error.toLowerCase();
  
  if (/invalid|malformed/.test(e) && /url|format/.test(e) ||
      e.includes('url format') || e.includes('invalid format')) {
    return ErrorType.CONFIG;
  }
  
  if (/network|fetch|connection|timeout|cors/.test(e)) {
    return ErrorType.NETWORK;
  }
  
  if (/auth|unauthorized|permission|forbidden|credentials/.test(e)) {
    return ErrorType.AUTH;
  }
  
  if (/database|table|sql|query|schema/.test(e)) {
    return ErrorType.DATABASE;
  }
  
  if (/config|settings|initialization/.test(e)) {
    return ErrorType.CONFIG;
  }
  
  return ErrorType.UNKNOWN;
};

export const createInitialContext = (environment: string): BootstrapContext => ({
  state: BootstrapState.INITIAL,
  retryCount: 0,
  lastAttempt: new Date().toISOString(),
  environment
});
