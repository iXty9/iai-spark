
import { emitDebugEvent } from './debug-events';

/**
 * Debug utility to track webhook communication
 */
export const logWebhookCommunication = (url: string, status: string, response?: any) => {
  const webhookType = url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS';
  const message = `${status} - ${webhookType} WEBHOOK (${url.split('/').pop()})`;
  
  console.log(`WEBHOOK DEBUG: ${message}`, response);
  
  // Emit the debug event to show in UI
  emitDebugEvent({
    lastAction: message,
    lastError: status === 'ERROR' ? 'Webhook communication failed' : null
  });
  
  // Emit webhook call event with details
  window.dispatchEvent(new CustomEvent('webhookCall', { 
    detail: { 
      webhookUrl: url,
      webhookType,
      status,
      timestamp: new Date().toISOString(),
      responseData: status === 'RESPONSE_RECEIVED' ? response : null
    } 
  }));
  
  // Return a debug-friendly object
  return {
    webhook: webhookType,
    url: url,
    status: status,
    timestamp: new Date().toISOString(),
    response: response
  };
};

/**
 * Parse webhook response to get the actual content
 * Handles different response formats from the webhook
 */
export const parseWebhookResponse = (data: any): string => {
  console.log('Parsing webhook response:', data);
  
  try {
    // Case 1: Array with text field (anonymous users)
    if (Array.isArray(data) && data.length > 0 && data[0].text) {
      console.log('Parsed webhook response format: Array with text field');
      return data[0].text;
    }
    
    // Case 2: Array with output field (authenticated users)
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      console.log('Parsed webhook response format: Array with output object');
      return data[0].output;
    }
    
    // Case 3: Direct object with text field
    if (data && typeof data === 'object' && data.text) {
      console.log('Parsed webhook response format: Object with text field');
      return data.text;
    }
    
    // Case 4: Direct object with output field
    if (data && typeof data === 'object' && data.output) {
      console.log('Parsed webhook response format: Object with output field');
      return data.output;
    }
    
    // Case 5: Direct string
    if (typeof data === 'string') {
      console.log('Parsed webhook response format: Direct string');
      return data;
    }
    
    // Fallback: Try to extract any meaningful text content
    console.log('Could not find standard fields, attempting to extract content');
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
    
    // If we still can't parse it, throw an error
    console.error('Could not parse webhook response - unknown format:', data);
    throw new Error('Unknown response format');
  } catch (error) {
    console.error('Error parsing webhook response:', error, data);
    throw error;
  }
};

/**
 * Create a debug panel for webhook communication
 */
export const createWebhookDebugPanel = () => {
  // Check if we already have a debug panel
  let panel = document.getElementById('webhook-debug-panel');
  
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'webhook-debug-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.zIndex = '9999';
    panel.style.maxWidth = '300px';
    panel.style.overflowY = 'auto';
    panel.style.maxHeight = '200px';
    document.body.appendChild(panel);
  }
  
  return {
    log: (message: string) => {
      const entry = document.createElement('div');
      entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
      panel?.appendChild(entry);
      
      // Keep only the last 10 entries
      while (panel && panel.children.length > 10) {
        panel.removeChild(panel.firstChild as Node);
      }
    }
  };
};

/**
 * Get the webhook URL based on authentication status
 */
export const getWebhookUrl = (isAuthenticated: boolean): string => {
  return isAuthenticated 
    ? 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7'
    : 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';
};
