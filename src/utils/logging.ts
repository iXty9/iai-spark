
/**
 * Centralized logging utility optimized for performance
 * Only logs in development environment with proper filtering and throttling
 */

// Early return for production to avoid all logging overhead
if (process.env.NODE_ENV === 'production') {
  // Export no-op logger for production
  export const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
} else {
  // Full logging implementation for development
  const logTimestamps: Record<string, number> = {};
  const LOG_THROTTLE_MS = 5000;
  const seenLogs = new Set<string>();
  const MAX_SEEN_LOGS = 200;

  // Clean up old logs periodically
  setInterval(() => {
    const now = Date.now();
    Object.keys(logTimestamps).forEach(key => {
      if (now - logTimestamps[key] > 60000) {
        delete logTimestamps[key];
      }
    });
    
    if (seenLogs.size > MAX_SEEN_LOGS) {
      seenLogs.clear();
    }
  }, 60000);

  type LogLevel = 'debug' | 'info' | 'warn' | 'error';

  interface LogOptions {
    throttle?: boolean;
    once?: boolean;
    module?: string;
    [key: string]: any;
  }

  function log(
    level: LogLevel,
    message: string,
    data?: any,
    options: LogOptions = {}
  ): void {
    const { throttle = false, once = false, module = 'app' } = options;
    
    const logKey = `${level}:${module}:${message}`;
    
    if (once && seenLogs.has(logKey)) {
      return;
    }
    
    if (throttle) {
      const now = Date.now();
      if (logKey in logTimestamps && now - logTimestamps[logKey] < LOG_THROTTLE_MS) {
        return;
      }
      logTimestamps[logKey] = now;
    }
    
    if (once) {
      seenLogs.add(logKey);
    }
    
    switch (level) {
      case 'debug':
        console.debug(`[${module}] ${message}`, data);
        break;
      case 'info':
        console.info(`[${module}] ${message}`, data);
        break;
      case 'warn':
        console.warn(`[${module}] ${message}`, data);
        break;
      case 'error':
        console.error(`[${module}] ${message}`, data);
        break;
    }
  }

  export const logger = {
    debug: (message: string, data?: any, options?: LogOptions) => 
      log('debug', message, data, options),
      
    info: (message: string, data?: any, options?: LogOptions) => 
      log('info', message, data, options),
      
    warn: (message: string, data?: any, options?: LogOptions) => 
      log('warn', message, data, options),
      
    error: (message: string, data?: any, options?: LogOptions) => 
      log('error', message, data, options)
  };
}
