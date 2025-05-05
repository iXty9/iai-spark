
/**
 * Centralized logging utility that only logs in development environment
 * with proper filtering and throttling
 */

// Track when logs were last emitted to avoid duplicates
const logTimestamps: Record<string, number> = {};
const LOG_THROTTLE_MS = 5000; // Only log same message every 5 seconds

// Track seen log messages in current session to avoid repeats
const seenLogs = new Set<string>();
const MAX_SEEN_LOGS = 200;

// Function to clear old logs periodically
setInterval(() => {
  // Clear timestamps older than 1 minute
  const now = Date.now();
  Object.keys(logTimestamps).forEach(key => {
    if (now - logTimestamps[key] > 60000) {
      delete logTimestamps[key];
    }
  });
  
  // If seen logs set is getting too large, clear it
  if (seenLogs.size > MAX_SEEN_LOGS) {
    seenLogs.clear();
  }
}, 60000);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  throttle?: boolean;
  once?: boolean;
  module?: string;
  imageUrl?: string; // Added missing property
  settings?: any; // Added missing property
}

/**
 * Log message only in development environment with throttling/filtering options
 */
export function log(
  level: LogLevel,
  message: string,
  data?: any,
  options: LogOptions = {}
): void {
  // Only log in development environment
  if (process.env.NODE_ENV !== 'development') return;
  
  const { throttle = false, once = false, module = 'app' } = options;
  
  // Create a unique key for this log message
  const logKey = `${level}:${module}:${message}`;
  
  // For one-time-only logs
  if (once && seenLogs.has(logKey)) {
    return;
  }
  
  // For throttled logs
  if (throttle) {
    const now = Date.now();
    if (logKey in logTimestamps && now - logTimestamps[logKey] < LOG_THROTTLE_MS) {
      return;
    }
    logTimestamps[logKey] = now;
  }
  
  // Add to seen logs if this is a once-only log
  if (once) {
    seenLogs.add(logKey);
  }
  
  // Output the log with the appropriate level
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

/**
 * Shorthand methods for different log levels
 */
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
