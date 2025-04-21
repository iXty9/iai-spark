
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
    // Case 1: Array with objects containing 'output' property
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      console.log('Parsed webhook response format: Array with output object');
      return data[0].output;
    }
    
    // Case 2: Direct object with 'output' property
    if (data && typeof data === 'object' && data.output) {
      console.log('Parsed webhook response format: Object with output property');
      return data.output;
    }
    
    // Case 3: Object with 'response' property
    if (data && typeof data === 'object' && data.response) {
      console.log('Parsed webhook response format: Object with response property');
      return data.response;
    }
    
    // Case 4: Object with 'message' property
    if (data && typeof data === 'object' && data.message) {
      console.log('Parsed webhook response format: Object with message property');
      return data.message;
    }
    
    // Case 5: Object with 'content' property
    if (data && typeof data === 'object' && data.content) {
      console.log('Parsed webhook response format: Object with content property');
      return data.content;
    }
    
    // Case 6: Direct string
    if (typeof data === 'string') {
      console.log('Parsed webhook response format: Direct string');
      return data;
    }
    
    // Fallback: Try to stringify the response if it's an object
    if (data && typeof data === 'object') {
      console.log('Parsed webhook response format: Unknown object structure, trying to use as is');
      const jsonString = JSON.stringify(data);
      return jsonString !== '{}' ? `Response: ${jsonString}` : "Received empty response object";
    }
    
    // No valid response format found
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
