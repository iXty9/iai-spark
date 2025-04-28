import { emitDebugEvent } from './debug-events';

// Track last log time to limit console output
let lastWebhookLogTime = Date.now();
const WEBHOOK_LOG_INTERVAL = 2000; // 2 seconds

/**
 * Debug utility to track webhook communication
 */
export const logWebhookCommunication = (url: string, status: string, response?: any) => {
  const webhookType = url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS';
  const message = `${status} - ${webhookType} WEBHOOK (${url.split('/').pop()})`;
  
  // Throttle console logging
  const currentTime = Date.now();
  if (currentTime - lastWebhookLogTime > WEBHOOK_LOG_INTERVAL) {
    console.log(`WEBHOOK DEBUG: ${message}`, response);
    lastWebhookLogTime = currentTime;
  }
  
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

// Track parse attempt counts
let parseAttempts = 0;
const PARSE_LOG_LIMIT = 5;
let lastParseResetTime = Date.now();
const PARSE_RESET_INTERVAL = 30000; // 30 seconds

/**
 * Parse webhook response to get the actual content
 * Handles different response formats from the webhook
 */
export const parseWebhookResponse = (data: any): string => {
  // Reset parse attempts counter periodically
  const currentTime = Date.now();
  if (currentTime - lastParseResetTime > PARSE_RESET_INTERVAL) {
    parseAttempts = 0;
    lastParseResetTime = currentTime;
  }
  
  // Limit logging of parse attempts
  parseAttempts++;
  if (parseAttempts <= PARSE_LOG_LIMIT) {
    console.log('Parsing webhook response:', data);
  }
  
  try {
    // Case 1: Array with text field (anonymous users)
    if (Array.isArray(data) && data.length > 0 && data[0].text) {
      if (parseAttempts <= PARSE_LOG_LIMIT) {
        console.log('Parsed webhook response format: Array with text field');
      }
      return data[0].text;
    }
    
    // Case 2: Array with output field (authenticated users)
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      if (parseAttempts <= PARSE_LOG_LIMIT) {
        console.log('Parsed webhook response format: Array with output object');
      }
      return data[0].output;
    }
    
    // Case 3: Direct object with text field
    if (data && typeof data === 'object' && data.text) {
      if (parseAttempts <= PARSE_LOG_LIMIT) {
        console.log('Parsed webhook response format: Object with text field');
      }
      return data.text;
    }
    
    // Case 4: Direct object with output field
    if (data && typeof data === 'object' && data.output) {
      if (parseAttempts <= PARSE_LOG_LIMIT) {
        console.log('Parsed webhook response format: Object with output field');
      }
      return data.output;
    }
    
    // Case 5: Direct string
    if (typeof data === 'string') {
      if (parseAttempts <= PARSE_LOG_LIMIT) {
        console.log('Parsed webhook response format: Direct string');
      }
      return data;
    }
    
    // Fallback: Try to extract any meaningful text content
    if (parseAttempts <= PARSE_LOG_LIMIT) {
      console.log('Could not find standard fields, attempting to extract content');
    }
    
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
    if (parseAttempts <= PARSE_LOG_LIMIT) {
      console.error('Could not parse webhook response - unknown format:', data);
    }
    throw new Error('Unknown response format');
  } catch (error) {
    if (parseAttempts <= PARSE_LOG_LIMIT) {
      console.error('Error parsing webhook response:', error, data);
    }
    throw error;
  }
};

// Debug panel state
let debugPanel: HTMLElement | null = null;

/**
 * Create a debug panel for webhook communication
 */
export const createWebhookDebugPanel = () => {
  // Check if we already have a debug panel
  if (!debugPanel) {
    debugPanel = document.createElement('div');
    debugPanel.id = 'webhook-debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.maxWidth = '300px';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.maxHeight = '200px';
    document.body.appendChild(debugPanel);
  }
  
  // Throttle log entries
  let lastLogTime = Date.now();
  const LOG_INTERVAL = 1000; // 1 second
  
  return {
    log: (message: string) => {
      const currentTime = Date.now();
      if (currentTime - lastLogTime > LOG_INTERVAL && debugPanel) {
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        debugPanel.appendChild(entry);
        
        // Keep only the last 5 entries to avoid DOM bloat
        while (debugPanel.children.length > 5) {
          debugPanel.removeChild(debugPanel.firstChild as Node);
        }
        
        lastLogTime = currentTime;
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
