import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';

// Cache for webhook URLs to avoid excessive database queries
let webhookUrlCache: Record<string, string> = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate a webhook URL - must be HTTPS
 */
export const isValidWebhookUrl = (url: string): boolean => {
  if (!url || url.trim() === '') {
    return false;
  }
  try {
    const webhookUrl = new URL(url);
    return webhookUrl.protocol === 'https:';
  } catch (error) {
    return false;
  }
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
    
    // Validate required webhook URLs are configured
    const requiredKeys = ['authenticated_webhook_url', 'anonymous_webhook_url', 'debug_webhook_url'];
    const missingKeys = requiredKeys.filter(key => !settings[key] || settings[key].trim() === '');
    
    if (missingKeys.length > 0) {
      throw new Error(
        `Webhook URLs not configured. Please configure the following in Admin Settings → Webhook Settings: ${missingKeys.join(', ')}`
      );
    }
    
    // Validate URLs are in correct format
    requiredKeys.forEach(key => {
      if (!isValidWebhookUrl(settings[key])) {
        throw new Error(
          `Invalid webhook URL for ${key}. URLs must use HTTPS protocol. Please update in Admin Settings → Webhook Settings.`
        );
      }
    });
    
    // Update cache with validated values
    webhookUrlCache = {
      'authenticated_webhook_url': settings['authenticated_webhook_url'],
      'anonymous_webhook_url': settings['anonymous_webhook_url'],
      'debug_webhook_url': settings['debug_webhook_url'],
      'webhook_timeout': settings['webhook_timeout'] || '300000' // Default 5 minutes (300,000ms)
    };
    
    lastCacheUpdate = now;
    logger.info('Webhook cache refreshed successfully', null, { module: 'webhook' });
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
