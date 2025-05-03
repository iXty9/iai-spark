
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { getWebhookUrl, getWebhookTimeout } from './url-provider';
import { isValidWebhookUrl } from './cache/url-cache';
import { webhookRateLimiter } from './utils/rate-limiter';
import { 
  logWebhookActivity, 
  dispatchWebhookRequestStart, 
  dispatchWebhookRequestEnd,
  dispatchWebhookRequestError
} from './utils/webhook-events';

/**
 * Sends a message to the appropriate webhook based on authentication status
 */
export const sendWebhookMessage = async (
  message: string,
  isAuthenticated: boolean
): Promise<any> => {
  // Apply rate limiting based on authentication status
  const rateLimitKey = isAuthenticated ? 'authenticated' : 'anonymous';
  if (!webhookRateLimiter.checkLimit(rateLimitKey)) {
    const error = new Error('Rate limit exceeded for webhook calls');
    logger.warn('Webhook rate limit exceeded', { isAuthenticated }, { module: 'webhook' });
    throw error;
  }
  
  const webhookUrl = await getWebhookUrl(isAuthenticated);
  
  // Get configurable timeout
  const timeoutMs = await getWebhookTimeout();
  
  // Validate URL again right before using it
  if (!isValidWebhookUrl(webhookUrl)) {
    const error = new Error('Invalid webhook URL');
    logger.error('Attempted to use invalid webhook URL', { url: webhookUrl }, { module: 'webhook' });
    throw error;
  }
  
  // Log only in development
  if (process.env.NODE_ENV === 'development') {
    logger.info(`Using webhook for ${isAuthenticated ? 'authenticated' : 'anonymous'} user`, 
      { url: webhookUrl }, 
      { module: 'webhook' }
    );
  }
  
  emitDebugEvent({
    lastAction: `API: Sending to webhook`,
    isLoading: true
  });
  
  // Log webhook activity
  logWebhookActivity(webhookUrl, 'REQUEST_SENT');
  
  try {
    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const requestStartTime = Date.now();
    const requestId = `request-${requestStartTime}`;
    
    // Dispatch event to track request start for timer component
    dispatchWebhookRequestStart(requestId, timeoutMs);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        timestamp: new Date().toISOString(),
        isAuthenticated: isAuthenticated
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Dispatch event to track request end
    dispatchWebhookRequestEnd(requestId, requestStartTime, response.status);
    
    if (!response.ok) {
      logWebhookActivity(webhookUrl, 'ERROR', { status: response.status });
      throw new Error(`Webhook responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    logWebhookActivity(webhookUrl, 'RESPONSE_RECEIVED', data);
    
    emitDebugEvent({
      lastAction: `API: Webhook response received`,
      isLoading: false
    });
    
    return data;
  } catch (error) {
    // Handle different error types
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    
    // Dispatch event to track request error
    dispatchWebhookRequestError(error, isTimeout);
    
    if (isTimeout) {
      logger.error('Webhook request timed out', { url: webhookUrl }, { module: 'webhook' });
      logWebhookActivity(webhookUrl, 'ERROR', { message: 'Request timed out' });
      throw new Error(`Webhook request timed out after ${timeoutMs / 1000} seconds`);
    }
    
    logger.error('Webhook request failed', error, { module: 'webhook' });
    logWebhookActivity(webhookUrl, 'ERROR', error);
    throw error;
  }
};
