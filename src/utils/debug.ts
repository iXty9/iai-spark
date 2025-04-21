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
