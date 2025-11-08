
import { logger } from '@/utils/logging';
import { 
  refreshWebhookCache, 
  getWebhookUrlFromCache, 
  isValidWebhookUrl,
  getDefaultUrls 
} from './cache/url-cache';

/**
 * Get the appropriate webhook URL based on authentication status
 */
export const getWebhookUrl = async (isAuthenticated: boolean): Promise<string> => {
  try {
    await refreshWebhookCache();
    const urlKey = isAuthenticated ? 'authenticated_webhook_url' : 'anonymous_webhook_url';
    const url = getWebhookUrlFromCache(urlKey);
    const { DEFAULT_AUTHENTICATED_WEBHOOK, DEFAULT_ANONYMOUS_WEBHOOK } = getDefaultUrls();
      
    // Validate URL before returning
    if (url && isValidWebhookUrl(url)) {
      return url;
    } else {
      // If URL is invalid, log the issue and use default
      logger.warn('Invalid webhook URL detected, using fallback', 
        { url, isAuthenticated }, 
        { module: 'webhook' }
      );
      return isAuthenticated ? DEFAULT_AUTHENTICATED_WEBHOOK : DEFAULT_ANONYMOUS_WEBHOOK;
    }
  } catch (error) {
    logger.error('Failed to get webhook URL, using fallback', error, { module: 'webhook' });
    // Fallback to the original hardcoded URLs if we can't get from the database
    const { DEFAULT_AUTHENTICATED_WEBHOOK, DEFAULT_ANONYMOUS_WEBHOOK } = getDefaultUrls();
    return isAuthenticated ? DEFAULT_AUTHENTICATED_WEBHOOK : DEFAULT_ANONYMOUS_WEBHOOK;
  }
};

/**
 * Get the debug webhook URL
 */
export const getDebugWebhookUrl = async (): Promise<string> => {
  try {
    await refreshWebhookCache();
    const url = getWebhookUrlFromCache('debug_webhook_url');
    const { DEFAULT_DEBUG_WEBHOOK } = getDefaultUrls();
    
    // Validate URL before returning
    if (url && isValidWebhookUrl(url)) {
      return url;
    } else {
      // If URL is invalid, log the issue and use default
      logger.warn('Invalid debug webhook URL detected, using fallback', 
        { url }, 
        { module: 'webhook' }
      );
      return DEFAULT_DEBUG_WEBHOOK;
    }
  } catch (error) {
    logger.error('Failed to get debug webhook URL, using fallback', error, { module: 'webhook' });
    const { DEFAULT_DEBUG_WEBHOOK } = getDefaultUrls();
    return DEFAULT_DEBUG_WEBHOOK;
  }
};

/**
 * Get the configured webhook timeout
 */
export const getWebhookTimeout = async (): Promise<number> => {
  try {
    await refreshWebhookCache();
    const timeoutStr = getWebhookUrlFromCache('webhook_timeout');
    return parseInt(timeoutStr || '300000'); // Default to 5 minutes
  } catch (error) {
    logger.error('Failed to get webhook timeout, using default', error, { module: 'webhook' });
    return 300000; // Default 5 minutes
  }
};
