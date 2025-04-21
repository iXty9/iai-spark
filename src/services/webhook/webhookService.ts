
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { logWebhookCommunication, parseWebhookResponse } from '@/utils/debug';

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
  
  console.log(`Using webhook URL for ${isAuthenticated ? 'authenticated' : 'anonymous'} user:`, webhookUrl);
  emitDebugEvent({
    lastAction: `API: Sending to webhook: ${webhookUrl}`,
    isLoading: true
  });
  
  // Log webhook request for debugging
  logWebhookCommunication(webhookUrl, 'REQUEST_SENT');
  
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
    logWebhookCommunication(webhookUrl, 'ERROR', { status: response.status });
    throw new Error(`Webhook responded with status: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Webhook response received:', data);
  
  // Log webhook response for debugging
  logWebhookCommunication(webhookUrl, 'RESPONSE_RECEIVED', data);
  
  emitDebugEvent({
    lastAction: `API: Real webhook response received from ${webhookUrl}`,
    isLoading: false
  });
  
  return data;
};

