
import { emitDebugEvent } from './debug-events';
import { logger } from './logging';
import { sendDebugWebhookMessage } from '@/services/webhook/webhookService';

/**
 * Parse webhook response to get the actual content
 * Handles different response formats from the webhook
 */
export const parseWebhookResponse = (data: any): string => {
  try {
    // Log just once on first parse attempt
    const parseAttemptLogged = sessionStorage.getItem('webhook-parse-logged');
    if (!parseAttemptLogged && process.env.NODE_ENV === 'development') {
      logger.debug('Parsing webhook response', data, { once: true, module: 'webhook' });
      sessionStorage.setItem('webhook-parse-logged', 'true');
    }
    
    // Case 1: Array with text field (anonymous users)
    if (Array.isArray(data) && data.length > 0 && data[0].text) {
      return data[0].text;
    }
    
    // Case 2: Array with output field (authenticated users)
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      return data[0].output;
    }
    
    // Case 3: Direct object with text field
    if (data && typeof data === 'object' && data.text) {
      return data.text;
    }
    
    // Case 4: Direct object with output field
    if (data && typeof data === 'object' && data.output) {
      return data.output;
    }
    
    // Case 5: Direct string
    if (typeof data === 'string') {
      return data;
    }
    
    // Fallback: Try to extract any meaningful text content
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      // Look for any property that might contain the message
      const possibleKeys = ['content', 'message', 'response'];
      for (const key of possibleKeys) {
        if (firstItem[key] && typeof firstItem[key] === 'string') {
          return firstItem[key];
        }
      }
    }
    
    // If we can't parse it, log the error once and throw
    logger.error('Could not parse webhook response - unknown format', data, { module: 'webhook' });
    throw new Error('Unknown response format');
  } catch (error) {
    logger.error('Error parsing webhook response', error, { module: 'webhook' });
    throw error;
  }
};

/**
 * Get the webhook URL based on authentication status
 * @deprecated Use webhookService.getWebhookUrl instead
 */
export const getWebhookUrl = (isAuthenticated: boolean): string => {
  return isAuthenticated 
    ? 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7'
    : 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';
};

/**
 * Simple debug info logger - cleanly separated from business logic
 */
export const logWebhookActivity = (url: string, status: string, data?: any) => {
  const webhookType = url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS';
  const message = `${status} - ${webhookType} WEBHOOK`;
  
  emitDebugEvent({
    lastAction: message,
    lastError: status === 'ERROR' ? 'Webhook communication failed' : null
  });
  
  // Only log errors and completions to avoid noise
  if (status === 'ERROR') {
    logger.error(`Webhook ${status}`, { webhookType, error: data }, { module: 'webhook' });
  } else if (status === 'RESPONSE_RECEIVED') {
    logger.info(`Webhook response received`, { webhookType }, { module: 'webhook', throttle: true });
  }
  
  // Return the webhook information (no logging)
  return {
    webhook: webhookType,
    url: url,
    status: status
  };
};

/**
 * Send debug information to webhook - only when DevMode is enabled
 * This is completely separate from the business logic
 */
export const sendDebugInfo = async (debugInfo: any) => {
  try {
    const result = await sendDebugWebhookMessage(debugInfo);
    return { success: !result.error };
  } catch (error) {
    return { success: false, error };
  }
};
