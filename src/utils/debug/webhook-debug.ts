
import { emitDebugEvent } from '../debug-events';
import { logger } from '../logging';
import { handleError } from '../error-handling';
import { sendDebugWebhookMessage } from '@/services/webhook';

/**
 * Webhook debugging utilities
 */

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
      const possibleKeys = ['content', 'message', 'response'];
      for (const key of possibleKeys) {
        if (firstItem[key] && typeof firstItem[key] === 'string') {
          return firstItem[key];
        }
      }
    }
    
    throw new Error('Unknown response format');
  } catch (error) {
    const appError = handleError(error, 'webhook-parser');
    throw new Error(appError.message);
  }
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
  
  return {
    webhook: webhookType,
    url: url,
    status: status
  };
};

/**
 * Send debug information to webhook - only when DevMode is enabled
 */
export const sendDebugInfo = async (debugInfo: any) => {
  try {
    const result = await sendDebugWebhookMessage(debugInfo);
    return { success: !result.error, error: result.error };
  } catch (error) {
    const appError = handleError(error, 'debug-webhook');
    return { success: false, error: appError.message };
  }
};
