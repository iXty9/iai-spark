
import { logger } from '@/utils/logging';
import { 
  refreshWebhookCache, 
  getWebhookUrlFromCache, 
  isValidWebhookUrl
} from './cache/url-cache';

/**
 * Get the appropriate webhook URL based on authentication status
 */
export const getWebhookUrl = async (isAuthenticated: boolean): Promise<string> => {
  try {
    // Refresh cache for the correct auth context
    await refreshWebhookCache(isAuthenticated);
    const urlKey = isAuthenticated ? 'authenticated_webhook_url' : 'anonymous_webhook_url';
    const url = getWebhookUrlFromCache(urlKey);
      
    if (!url || !isValidWebhookUrl(url)) {
      throw new Error(
        `Webhook URL for ${urlKey} is not configured or invalid. Please configure webhook URLs in Admin Settings → Webhook Settings.`
      );
    }
    
    return url;
  } catch (error) {
    logger.error('Failed to get webhook URL', error, { module: 'webhook' });
    throw error;
  }
};

/**
 * Get the debug webhook URL
 */
export const getDebugWebhookUrl = async (): Promise<string> => {
  try {
    // Debug webhooks are only expected in authenticated/admin context
    await refreshWebhookCache(true);
    const url = getWebhookUrlFromCache('debug_webhook_url');
    
    if (!url || !isValidWebhookUrl(url)) {
      throw new Error(
        'Debug webhook URL is not configured or invalid. Please configure webhook URLs in Admin Settings → Webhook Settings.'
      );
    }
    
    return url;
  } catch (error) {
    logger.error('Failed to get debug webhook URL', error, { module: 'webhook' });
    throw error;
  }
};

/**
 * Get the configured webhook timeout
 */
export const getWebhookTimeout = async (isAuthenticated: boolean): Promise<number> => {
  try {
    // Reuse the same context-aware cache refresh
    await refreshWebhookCache(isAuthenticated);
    const timeoutStr = getWebhookUrlFromCache('webhook_timeout');
    return parseInt(timeoutStr || '300000'); // Default to 5 minutes
  } catch (error) {
    logger.error('Failed to get webhook timeout, using default', error, { module: 'webhook' });
    return 300000; // Default 5 minutes
  }
};
