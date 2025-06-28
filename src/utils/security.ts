
/**
 * Security utilities for URL validation and input sanitization
 */

/**
 * Validate URL with flexible domain and protocol restrictions
 * @param url - The URL to validate
 * @param allowedDomains - Optional array of allowed domains (if empty, allows any domain)
 * @param allowedProtocols - Array of allowed protocols (defaults to ['https:'])
 */
export const isValidUrl = (
  url: string, 
  allowedDomains: string[] = [], 
  allowedProtocols: string[] = ['https:']
): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // If no domain restrictions, allow any domain
    if (allowedDomains.length === 0) {
      return true;
    }
    
    // Check if domain is in allowed list
    return allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    return false;
  }
};

/**
 * Sanitize URL for safe usage
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Return the URL if it's valid
    return parsedUrl.toString();
  } catch (error) {
    // Return empty string for invalid URLs
    return '';
  }
};

/**
 * Sanitize input string to prevent XSS and injection attacks
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic sanitization - remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * File validation options interface
 */
export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  maxDimensions?: { width: number; height: number };
}

/**
 * Validate file securely with size and type restrictions
 */
export const validateFileSecurely = (
  file: File, 
  options: FileValidationOptions
): string | null => {
  // Check file size
  if (file.size > options.maxSize) {
    const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
    return `File too large. Maximum size is ${maxSizeMB}MB`;
  }
  
  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    const allowedTypesStr = options.allowedTypes
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ');
    return `Invalid file type. Allowed types: ${allowedTypesStr}`;
  }
  
  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/')) {
    return 'Invalid file name';
  }
  
  return null; // No validation errors
};
