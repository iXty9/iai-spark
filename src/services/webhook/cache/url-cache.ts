import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';

// Cache for webhook URLs to avoid excessive database queries
let webhookUrlCache: Record<string, string> = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get default webhook URLs - returns empty strings to force database configuration
 * SECURITY: Hardcoded URLs removed to prevent exposure in client code
 */
export const getDefaultUrls = () => {
  return {
    DEFAULT_AUTHENTICATED_WEBHOOK: '',
    DEFAULT_ANONYMOUS_WEBHOOK: '',
    DEFAULT_DEBUG_WEBHOOK: ''
  };
};

/**
 * Refresh the webhook URL cache if it has expired
 */
export const refreshWebhookCache = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL && Object.keys(webhookUrlCache).length > 0) {
    return; // Use cached values if they're fresh
  }

  try {
    const settings = await fetchAppSettings();
    const { DEFAULT_AUTHENTICATED_WEBHOOK, DEFAULT_ANONYMOUS_WEBHOOK, DEFAULT_DEBUG_WEBHOOK } = getDefaultUrls();
    
    // Update cache with new values, using defaults if not configured
    webhookUrlCache = {
      'authenticated_webhook_url': settings['authenticated_webhook_url'] || DEFAULT_AUTHENTICATED_WEBHOOK,
      'anonymous_webhook_url': settings['anonymous_webhook_url'] || DEFAULT_ANONYMOUS_WEBHOOK,
      'debug_webhook_url': settings['debug_webhook_url'] || DEFAULT_DEBUG_WEBHOOK,
      'webhook_timeout': settings['webhook_timeout'] || '300000' // Default 5 minutes (300,000ms)
    };
    
    // Log any invalid URLs for admin awareness (but don't block them)
    Object.entries(webhookUrlCache).forEach(([key, url]) => {
      if (key !== 'webhook_timeout' && !isValidWebhookUrl(url)) {
        logger.warn(`Potentially invalid webhook URL detected for ${key}`, { url }, { module: 'webhook' });
      }
    });
    
    lastCacheUpdate = now;
  } catch (error) {
    logger.error('Error refreshing webhook cache:', error, { module: 'webhook' });
    throw error;
  }
};

/**
 * Get a specific URL from the cache
 */
export const getWebhookUrlFromCache = (key: string): string => {
  return webhookUrlCache[key] || '';
};

/**
 * Check if the webhook URL cache is initialized
 */
export const isCacheInitialized = (): boolean => {
  return Object.keys(webhookUrlCache).length > 0;
};

/**
 * Validate a webhook URL - now more permissive to allow different domains
 */
export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const webhookUrl = new URL(url);
    // Allow HTTPS URLs from any domain (removed domain restriction)
    // Still require HTTPS for security
    return webhookUrl.protocol === 'https:';
  } catch (error) {
    return false;
  }
};
