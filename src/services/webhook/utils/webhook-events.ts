
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';

/**
 * Helper for logging webhook activity to prevent code duplication
 */
export const logWebhookActivity = (url: string, status: string, data?: any) => {
  // Determine webhook type by URL pattern
  let webhookType = 'UNKNOWN';
  
  // Try to infer the webhook type from the URL pattern
  if (url.includes('9553f3d014f7')) {
    webhookType = 'AUTHENTICATED';
  } else if (url.includes('9553f3d8534')) {
    webhookType = 'DEBUG';
  } else if (url.includes('9553f3d36574')) {
    webhookType = 'ANONYMOUS';
  }
  
  const message = `${status} - ${webhookType} WEBHOOK`;
  
  // Emit debug event for UI components
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
  
  // Notify any listeners about webhook activity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('webhookCall', {
      detail: {
        webhookUrl: url,
        webhookType,
        status,
        timestamp: new Date().toISOString(),
        responseData: status === 'RESPONSE_RECEIVED' ? data : null
      }
    }));
  }
  
  return {
    webhook: webhookType,
    url,
    status
  };
};

/**
 * Dispatch event to track webhook request start
 */
export const dispatchWebhookRequestStart = (requestId: string, timeoutMs: number) => {
  window.dispatchEvent(new CustomEvent('webhookRequestStart', {
    detail: {
      requestId,
      startTime: Date.now(),
      timeout: timeoutMs
    }
  }));
};

/**
 * Dispatch event to track webhook request end
 */
export const dispatchWebhookRequestEnd = (requestId: string, startTime: number, status: number) => {
  window.dispatchEvent(new CustomEvent('webhookRequestEnd', {
    detail: {
      requestId,
      duration: Date.now() - startTime,
      status
    }
  }));
};

/**
 * Dispatch event to track webhook request error
 */
export const dispatchWebhookRequestError = (error: unknown, isTimeout: boolean) => {
  window.dispatchEvent(new CustomEvent('webhookRequestError', {
    detail: {
      error: error instanceof Error ? error.message : 'Unknown error',
      isTimeout
    }
  }));
};
