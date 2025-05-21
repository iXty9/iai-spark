
import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};

/**
 * Validates if a string is a valid URL with allowed protocols and domains
 * @param url The URL to validate
 * @param allowedDomains Optional array of allowed domains
 * @param allowedProtocols Optional array of allowed protocols
 * @returns Boolean indicating if the URL is valid
 */
export const isValidUrl = (
  url: string, 
  allowedDomains?: string[], 
  allowedProtocols: string[] = ['https:']
): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check domain if restrictions provided
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(domain => 
        parsedUrl.hostname === domain || 
        parsedUrl.hostname.endsWith(`.${domain}`)
      );
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Simple rate limiting utility for client-side functions
 */
export class RateLimiter {
  private calls: Map<string, { count: number, resetTime: number }>;
  private limit: number;
  private timeWindow: number;
  
  constructor(limit: number, timeWindowMs: number) {
    this.calls = new Map();
    this.limit = limit;
    this.timeWindow = timeWindowMs;
  }
  
  /**
   * Checks if the action is allowed under rate limits
   * @param key Identifier for the rate limited action
   * @returns Boolean indicating if action is allowed
   */
  checkLimit(key: string): boolean {
    const now = Date.now();
    const record = this.calls.get(key);
    
    // If no record exists or the time window has passed, create/reset the record
    if (!record || now > record.resetTime) {
      this.calls.set(key, { count: 1, resetTime: now + this.timeWindow });
      return true;
    }
    
    // Check if limit is reached
    if (record.count >= this.limit) {
      return false;
    }
    
    // Update call count
    record.count++;
    return true;
  }
  
  /**
   * Resets rate limit counter for a specific key
   * @param key Identifier to reset
   */
  reset(key: string): void {
    this.calls.delete(key);
  }
}

/**
 * Creates a secure random ID
 * @param length The length of the ID to generate
 * @returns Random ID string
 */
export const generateSecureId = (length: number = 16): string => {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, length);
  } else {
    // Fallback for non-browser environments
    return Math.random().toString(36).substring(2, 2 + length);
  }
};

/**
 * Validates a file against security constraints
 * @param file The file to validate
 * @param options Validation options
 * @returns Error message or null if valid
 */
export const validateFileSecurely = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): string | null => {
  const { 
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;
  
  if (!allowedTypes.includes(file.type)) {
    return `File type not allowed. Accepted types: ${allowedTypes.join(', ')}`;
  }
  
  if (file.size > maxSize) {
    return `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`;
  }
  
  return null;
};
