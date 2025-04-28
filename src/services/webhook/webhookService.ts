
import { emitDebugEvent } from '@/utils/debug-events';
import { logWebhookActivity, parseWebhookResponse } from '@/utils/debug';
import { logger } from '@/utils/logging';

// Webhook URLs
const AUTHENTICATED_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';
const ANONYMOUS_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';

export const getWebhookUrl = (isAuthenticated: boolean): string => {
  return isAuthenticated ? AUTHENTICATED_WEBHOOK_URL : ANONYMOUS_WEBHOOK_URL;
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
  
  // Log webhook activity through our centralized function
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
    
    // Log webhook activity through our centralized function
    logWebhookActivity(webhookUrl, 'RESPONSE_RECEIVED');
    
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
