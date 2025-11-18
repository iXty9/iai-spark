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
    
    // Determine which webhook URLs the current user can see based on RLS
    // Anonymous users can only see anonymous_webhook_url
    // Authenticated users can see both
    const visibleWebhookKeys = Object.keys(settings).filter(key => 
      key === 'anonymous_webhook_url' || key === 'authenticated_webhook_url'
    );
    
    // Validate that at least ONE webhook URL is configured and visible
    if (visibleWebhookKeys.length === 0) {
      throw new Error(
        'No webhook URLs are configured or visible to your user role. Please contact an administrator.'
      );
    }
    
    // Validate that visible URLs are in correct format
    visibleWebhookKeys.forEach(key => {
      if (!isValidWebhookUrl(settings[key])) {
        throw new Error(
          `Invalid webhook URL for ${key}. URLs must use HTTPS protocol. Please contact an administrator.`
        );
      }
    });
    
    // Update cache with validated values
    // Only cache what this user can actually see
    webhookUrlCache = {
      'authenticated_webhook_url': settings['authenticated_webhook_url'] || '',
      'anonymous_webhook_url': settings['anonymous_webhook_url'] || '',
      'debug_webhook_url': settings['debug_webhook_url'] || '',
      'webhook_timeout': settings['webhook_timeout'] || '300000' // Default 5 minutes (300,000ms)
    };
    
    lastCacheUpdate = now;
    logger.info('Webhook cache refreshed successfully', { 
      visibleKeys: visibleWebhookKeys 
    }, { module: 'webhook' });
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
