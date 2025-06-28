
/**
 * Security utilities for URL validation
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
