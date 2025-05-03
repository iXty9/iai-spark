
import { logger } from '@/utils/logging';
import { getDebugWebhookUrl } from './url-provider';
import { isValidWebhookUrl } from './cache/url-cache';

/**
 * Sends debug information to a webhook
 */
export const sendDebugWebhookMessage = async (debugInfo: any): Promise<any> => {
  const webhookUrl = await getDebugWebhookUrl();
  
  // Validate URL before using
  if (!isValidWebhookUrl(webhookUrl)) {
    logger.error('Invalid debug webhook URL', { url: webhookUrl }, { module: 'debug' });
    return { error: true, message: 'Invalid debug webhook URL' };
  }
  
  try {
    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...debugInfo,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      logger.error('Debug webhook failed', { status: response.status }, { module: 'debug' });
      return { error: true, status: response.status };
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.error('Debug webhook request timed out', { url: webhookUrl }, { module: 'debug' });
      return { error: true, message: 'Request timed out' };
    }
    
    logger.error('Debug webhook request failed', error, { module: 'debug' });
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
