
import { logger } from '@/utils/logging';
import { getDebugWebhookUrl } from './url-provider';
import { isValidWebhookUrl } from './cache/url-cache';

// Track debug webhook calls to implement rate limiting
const debugWebhookTracker = {
  lastCall: 0,
  callCount: 0,
  // Reset period for call count (1 hour)
  resetPeriod: 60 * 60 * 1000,
  // Minimum time between calls (30 seconds) - reduced from 1 minute
  minInterval: 30 * 1000,
  // Maximum calls per reset period
  maxCalls: 30,
  
  canSendWebhook(): boolean {
    const now = Date.now();
    
    // Reset counter if it's been longer than reset period
    if (now - this.lastCall > this.resetPeriod) {
      this.callCount = 0;
    }
    
    // Check if limit is reached
    if (this.callCount >= this.maxCalls) {
      return false;
    }
    
    // Check if enough time passed since last call
    if (now - this.lastCall < this.minInterval) {
      return false;
    }
    
    return true;
  },
  
  recordCall() {
    this.lastCall = Date.now();
    this.callCount++;
  }
};

// Maximum size of debug payload to send (50 KB)
const MAX_DEBUG_PAYLOAD_SIZE = 50 * 1024;

/**
 * Compresses debug information to reduce payload size
 */
const compressDebugInfo = (debugInfo: any): any => {
  if (!debugInfo) return debugInfo;
  
  // Create a compressed version
  const compressed: any = {};
  
  // Only include essential fields
  if (debugInfo.timestamp) compressed.timestamp = debugInfo.timestamp;
  if (debugInfo.type) compressed.type = debugInfo.type;
  
  // For supabase info, only include connection status and errors
  if (debugInfo.supabaseInfo) {
    compressed.supabaseInfo = {
      connectionStatus: debugInfo.supabaseInfo.connectionStatus,
      lastError: debugInfo.supabaseInfo.lastError
    };
    
    // Include auth status but skip details
    if (debugInfo.supabaseInfo.authStatus) {
      compressed.supabaseInfo.authStatus = debugInfo.supabaseInfo.authStatus;
    }
  }
  
  // For environment info, only include type
  if (debugInfo.environmentInfo) {
    compressed.environmentInfo = {
      type: debugInfo.environmentInfo.type
    };
  }
  
  // For errors, keep them but strip stacktraces
  if (debugInfo.error) {
    if (typeof debugInfo.error === 'string') {
      compressed.error = debugInfo.error;
    } else {
      compressed.error = {
        message: debugInfo.error.message,
        name: debugInfo.error.name
      };
    }
  }
  
  // For events, only include critical ones
  if (debugInfo.lastAction) compressed.lastAction = debugInfo.lastAction;
  if (debugInfo.lastError) compressed.lastError = debugInfo.lastError;
  
  return compressed;
};

/**
 * Sends debug information to a webhook
 */
export const sendDebugWebhookMessage = async (debugInfo: any): Promise<any> => {
  // Apply rate limiting
  if (!debugWebhookTracker.canSendWebhook()) {
    logger.debug('Debug webhook rate limited', { 
      callCount: debugWebhookTracker.callCount,
      lastCall: new Date(debugWebhookTracker.lastCall).toISOString()
    }, { module: 'debug' });
    return { rateLimited: true };
  }
  
  const webhookUrl = await getDebugWebhookUrl();
  
  // Validate URL before using
  if (!isValidWebhookUrl(webhookUrl)) {
    logger.error('Invalid debug webhook URL', { url: webhookUrl }, { module: 'debug' });
    return { error: true, message: 'Invalid debug webhook URL' };
  }
  
  try {
    // Record this call
    debugWebhookTracker.recordCall();
    
    // Compress debug info
    const compressedInfo = compressDebugInfo(debugInfo);
    
    // Add request timeout - increased from 10 to 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // Convert to JSON and check size
    const jsonPayload = JSON.stringify({
      ...compressedInfo,
      timestamp: new Date().toISOString(),
    });
    
    // Skip if payload is too large
    if (jsonPayload.length > MAX_DEBUG_PAYLOAD_SIZE) {
      logger.warn('Debug webhook payload too large, skipping', { 
        size: jsonPayload.length,
        maxSize: MAX_DEBUG_PAYLOAD_SIZE 
      }, { module: 'debug' });
      clearTimeout(timeoutId);
      return { error: true, message: 'Payload too large' };
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonPayload,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      logger.error('Debug webhook failed', { status: response.status }, { module: 'debug' });
      return { error: true, status: response.status };
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.error('Debug webhook request timed out after 30 seconds', { url: webhookUrl }, { module: 'debug' });
      return { error: true, message: 'Request timed out after 30 seconds' };
    }
    
    logger.error('Debug webhook request failed', error, { module: 'debug' });
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
