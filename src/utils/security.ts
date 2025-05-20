
/**
 * Security utilities for input sanitization and validation
 */

// DOMPurify may not be available in all environments or may cause build issues
// This is a simplified sanitizer that handles common XSS vectors
export function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Convert to string if not already
  const str = String(input);
  
  // Simple sanitization for XSS vectors
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate URL format
 * @param url URL to validate
 * @returns True if URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safe JSON parse with fallback
 * @param json JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed JSON or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
