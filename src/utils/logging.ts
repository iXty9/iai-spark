
/**
 * High-performance logging utility optimized for production builds
 * Zero-cost in production with proper tree-shaking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  throttle?: boolean;
  once?: boolean;
  module?: string;
  [key: string]: any;
}

// Production no-op that gets completely tree-shaken
const createNoOpLogger = () => ({
  debug: (() => {}) as (message: string, data?: any, options?: LogOptions) => void,
  info: (() => {}) as (message: string, data?: any, options?: LogOptions) => void,
  warn: (() => {}) as (message: string, data?: any, options?: LogOptions) => void,
  error: (() => {}) as (message: string, data?: any, options?: LogOptions) => void
});

// Development logger with performance optimizations
const createDevLogger = () => {
  // Early production check for tree-shaking
  if (process.env.NODE_ENV === 'production') {
    return createNoOpLogger();
  }

  // Use WeakMap for better memory management
  const logTimestamps = new Map<string, number>();
  const seenLogs = new Set<string>();
  const LOG_THROTTLE_MS = 5000;
  const MAX_SEEN_LOGS = 200;
  const MAX_TIMESTAMPS = 100;

  // Efficient cleanup with batch operations
  const cleanup = () => {
    const now = Date.now();
    const cutoff = now - 60000;
    
    // Batch cleanup for timestamps
    for (const [key, timestamp] of logTimestamps.entries()) {
      if (timestamp < cutoff) {
        logTimestamps.delete(key);
      }
    }
    
    // Reset seen logs when it gets too large
    if (seenLogs.size > MAX_SEEN_LOGS) {
      seenLogs.clear();
    }
    
    // Limit timestamps map size
    if (logTimestamps.size > MAX_TIMESTAMPS) {
      const oldestEntries = Array.from(logTimestamps.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, 50);
      
      oldestEntries.forEach(([key]) => logTimestamps.delete(key));
    }
  };

  // Less frequent cleanup
  const cleanupInterval = setInterval(cleanup, 120000);
  
  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval);
    });
  }

  function log(
    level: LogLevel,
    message: string,
    data?: any,
    options: LogOptions = {}
  ): void {
    const { throttle = false, once = false, module = 'app' } = options;
    
    // Reduce theme/background noise - only show errors
    if (module === 'theme' && level !== 'error') {
      return;
    }
    
    const logKey = `${level}:${module}:${message}`;
    
    if (once && seenLogs.has(logKey)) {
      return;
    }
    
    if (throttle) {
      const now = Date.now();
      const lastLog = logTimestamps.get(logKey);
      if (lastLog && now - lastLog < LOG_THROTTLE_MS) {
        return;
      }
      logTimestamps.set(logKey, now);
    }
    
    if (once) {
      seenLogs.add(logKey);
    }
    
    // Use a single console call with consistent formatting
    const prefix = `[${module}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.info(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
        console.error(prefix, message, data);
        break;
    }
  }

  return {
    debug: (message: string, data?: any, options?: LogOptions) => 
      log('debug', message, data, options),
      
    info: (message: string, data?: any, options?: LogOptions) => 
      log('info', message, data, options),
      
    warn: (message: string, data?: any, options?: LogOptions) => 
      log('warn', message, data, options),
      
    error: (message: string, data?: any, options?: LogOptions) => 
      log('error', message, data, options)
  };
};

// Export with compile-time optimization for tree-shaking
export const logger = process.env.NODE_ENV === 'production' 
  ? createNoOpLogger() 
  : createDevLogger();

