
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';

// Webhook URLs
const AUTHENTICATED_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';
const ANONYMOUS_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';

// Debug webhook URL - separate from business functionality
const DEBUG_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d8534';

export const getWebhookUrl = (isAuthenticated: boolean): string => {
  return isAuthenticated ? AUTHENTICATED_WEBHOOK_URL : ANONYMOUS_WEBHOOK_URL;
};

export const getDebugWebhookUrl = (): string => {
  return DEBUG_WEBHOOK_URL;
};

// Helper for logging webhook activity to prevent code duplication
const logWebhookActivity = (url: string, status: string, data?: any) => {
  const webhookType = url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 
                     (url.includes('9553f3d8534') ? 'DEBUG' : 'ANONYMOUS');
  
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

export const sendWebhookMessage = async (
  message: string,
  isAuthenticated: boolean
): Promise<any> => {
  const webhookUrl = getWebhookUrl(isAuthenticated);
  
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
    });
    
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
    logger.error('Webhook request failed', error, { module: 'webhook' });
    logWebhookActivity(webhookUrl, 'ERROR', error);
    throw error;
  }
};

// Separate function for debug-only messages
export const sendDebugWebhookMessage = async (debugInfo: any): Promise<any> => {
  const webhookUrl = getDebugWebhookUrl();
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...debugInfo,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      logger.error('Debug webhook failed', { status: response.status }, { module: 'debug' });
      return { error: true, status: response.status };
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Debug webhook request failed', error, { module: 'debug' });
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
