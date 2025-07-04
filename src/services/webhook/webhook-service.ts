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

// Track webhook calls per tab session
const webhookSessionTracker = {
  callsThisSession: 0,
  tabActive: true,
  initialize() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.tabActive = document.visibilityState === 'visible';
      });
      this.tabActive = document.visibilityState === 'visible';
    }
  }
};

// Initialize session tracker
webhookSessionTracker.initialize();

/**
 * Sends a message to the appropriate webhook based on authentication status
 * Returns both the request payload and response for complete data preservation
 */
export const sendWebhookMessage = async (
  message: string,
  isAuthenticated: boolean,
  userInfo?: { id?: string; username?: string; first_name?: string; last_name?: string } | null,
  externalController?: AbortController
): Promise<{ request: any; response: any; cancel: () => void }> => {
  
  // Apply rate limiting based on authentication status
  const rateLimitKey = isAuthenticated ? 'authenticated' : 'anonymous';
  if (!webhookRateLimiter.checkLimit(rateLimitKey)) {
    const error = new Error('Rate limit exceeded for webhook calls');
    logger.warn('Webhook rate limit exceeded', { isAuthenticated }, { module: 'webhook' });
    throw error;
  }
  
  // Track calls per session
  webhookSessionTracker.callsThisSession++;
  
  const webhookUrl = await getWebhookUrl(isAuthenticated);
  
  // Get configurable timeout
  const timeoutMs = await getWebhookTimeout();
  
  // Validate URL again right before using
  if (!isValidWebhookUrl(webhookUrl)) {
    const error = new Error('Invalid webhook URL');
    logger.error('Attempted to use invalid webhook URL', { url: webhookUrl }, { module: 'webhook' });
    throw error;
  }
  
  // Log only in development and limit frequency
  if (process.env.NODE_ENV === 'development' && webhookSessionTracker.callsThisSession <= 5) {
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
    // Use external controller if provided, otherwise create new one
    const controller = externalController || new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Cancel function to abort the request
    const cancel = () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    
    const requestStartTime = Date.now();
    const requestId = `request-${requestStartTime}`;
    
    // Dispatch event to track request start for timer component
    dispatchWebhookRequestStart(requestId, timeoutMs);
    
    // Determine sender name based on authentication and user info
    let senderName;
    if (isAuthenticated) {
      // For authenticated users, try to get specific name info, fallback to 'Authenticated User'
      if (userInfo?.username) {
        senderName = userInfo.username;
      } else if (userInfo?.first_name) {
        senderName = userInfo.first_name;
      } else {
        // Always identify authenticated users as such, even without profile data
        senderName = 'Authenticated User';
      }
    } else {
      senderName = 'Anonymous';
    }
    
    // Prepare message - keep it compact but include proper sender info and user_id
    const payload = {
      message: message,
      sender: senderName,
      timestamp: new Date().toISOString(),
      isAuthenticated: isAuthenticated,
      sessionCall: webhookSessionTracker.callsThisSession,
      user_id: userInfo?.id || null
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
    
    // Return both request and response for complete data preservation
    return {
      request: payload,
      response: data,
      cancel
    };
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
