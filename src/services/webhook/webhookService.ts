
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';
import { fetchAppSettings } from '@/services/admin/settingsService';

// Cache for webhook URLs to avoid excessive database queries
let webhookUrlCache: Record<string, string> = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Safe default fallback URLs (at least they're specific to this app)
const DEFAULT_AUTHENTICATED_WEBHOOK = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';
const DEFAULT_ANONYMOUS_WEBHOOK = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';
const DEFAULT_DEBUG_WEBHOOK = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d8534';

// URL validation function
const isValidWebhookUrl = (url: string): boolean => {
  try {
    const webhookUrl = new URL(url);
    // Only allow https URLs from trusted domains
    return (
      webhookUrl.protocol === 'https:' && 
      (
        webhookUrl.hostname === 'n8n.ixty.ai' || 
        webhookUrl.hostname === 'api.ixty.ai' || 
        webhookUrl.hostname.endsWith('.ixty.ai')
      )
    );
  } catch (error) {
    return false;
  }
};

export const getWebhookUrl = async (isAuthenticated: boolean): Promise<string> => {
  try {
    await refreshWebhookCache();
    const url = isAuthenticated 
      ? webhookUrlCache['authenticated_webhook_url'] 
      : webhookUrlCache['anonymous_webhook_url'];
      
    // Validate URL before returning
    if (url && isValidWebhookUrl(url)) {
      return url;
    } else {
      // If URL is invalid, log the issue and use default
      logger.warn('Invalid webhook URL detected, using fallback', 
        { url, isAuthenticated }, 
        { module: 'webhook' }
      );
      return isAuthenticated ? DEFAULT_AUTHENTICATED_WEBHOOK : DEFAULT_ANONYMOUS_WEBHOOK;
    }
  } catch (error) {
    logger.error('Failed to get webhook URL, using fallback', error, { module: 'webhook' });
    // Fallback to the original hardcoded URLs if we can't get from the database
    return isAuthenticated ? DEFAULT_AUTHENTICATED_WEBHOOK : DEFAULT_ANONYMOUS_WEBHOOK;
  }
};

export const getDebugWebhookUrl = async (): Promise<string> => {
  try {
    await refreshWebhookCache();
    const url = webhookUrlCache['debug_webhook_url'];
    
    // Validate URL before returning
    if (url && isValidWebhookUrl(url)) {
      return url;
    } else {
      // If URL is invalid, log the issue and use default
      logger.warn('Invalid debug webhook URL detected, using fallback', 
        { url }, 
        { module: 'webhook' }
      );
      return DEFAULT_DEBUG_WEBHOOK;
    }
  } catch (error) {
    logger.error('Failed to get debug webhook URL, using fallback', error, { module: 'webhook' });
    return DEFAULT_DEBUG_WEBHOOK;
  }
};

// Helper to refresh the webhook URL cache
const refreshWebhookCache = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL && Object.keys(webhookUrlCache).length > 0) {
    return; // Use cached values if they're fresh
  }

  try {
    const settings = await fetchAppSettings();
    
    // Update cache with new values, ensuring they're valid URLs
    webhookUrlCache = {
      'authenticated_webhook_url': settings['authenticated_webhook_url'] || DEFAULT_AUTHENTICATED_WEBHOOK,
      'anonymous_webhook_url': settings['anonymous_webhook_url'] || DEFAULT_ANONYMOUS_WEBHOOK,
      'debug_webhook_url': settings['debug_webhook_url'] || DEFAULT_DEBUG_WEBHOOK,
      'webhook_timeout': settings['webhook_timeout'] || '300000' // Default 5 minutes (300,000ms)
    };
    
    // Log any invalid URLs for admin awareness
    Object.entries(webhookUrlCache).forEach(([key, url]) => {
      if (key !== 'webhook_timeout' && !isValidWebhookUrl(url)) {
        logger.warn(`Invalid webhook URL detected for ${key}`, { url }, { module: 'webhook' });
      }
    });
    
    lastCacheUpdate = now;
  } catch (error) {
    logger.error('Error refreshing webhook cache:', error, { module: 'webhook' });
    throw error;
  }
};

// Helper for logging webhook activity to prevent code duplication
const logWebhookActivity = (url: string, status: string, data?: any) => {
  // Determine webhook type securely without relying on URL patterns
  let webhookType = 'UNKNOWN';
  
  if (url === webhookUrlCache['authenticated_webhook_url']) {
    webhookType = 'AUTHENTICATED';
  } else if (url === webhookUrlCache['debug_webhook_url']) {
    webhookType = 'DEBUG';
  } else if (url === webhookUrlCache['anonymous_webhook_url']) {
    webhookType = 'ANONYMOUS';
  }
  
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

// Rate limiting implementation
const rateLimiter = {
  calls: new Map<string, { count: number, resetTime: number }>(),
  limit: 10, // Max calls per minute
  timeWindow: 60 * 1000, // 1 minute
  
  checkLimit(key: string): boolean {
    const now = Date.now();
    const record = this.calls.get(key);
    
    // If no record exists or the time window has passed, create/reset the record
    if (!record || now > record.resetTime) {
      this.calls.set(key, { count: 1, resetTime: now + this.timeWindow });
      return true;
    }
    
    // Check if limit is reached
    if (record.count >= this.limit) {
      return false;
    }
    
    // Update call count
    record.count++;
    return true;
  }
};

export const sendWebhookMessage = async (
  message: string,
  isAuthenticated: boolean
): Promise<any> => {
  // Apply rate limiting based on authentication status
  const rateLimitKey = isAuthenticated ? 'authenticated' : 'anonymous';
  if (!rateLimiter.checkLimit(rateLimitKey)) {
    const error = new Error('Rate limit exceeded for webhook calls');
    logger.warn('Webhook rate limit exceeded', { isAuthenticated }, { module: 'webhook' });
    throw error;
  }
  
  const webhookUrl = await getWebhookUrl(isAuthenticated);
  
  // Get configurable timeout (default 5 minutes)
  const timeoutMs = parseInt(webhookUrlCache['webhook_timeout'] || '300000');
  
  // Validate URL again right before using it
  if (!isValidWebhookUrl(webhookUrl)) {
    const error = new Error('Invalid webhook URL');
    logger.error('Attempted to use invalid webhook URL', { url: webhookUrl }, { module: 'webhook' });
    throw error;
  }
  
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
    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const requestStartTime = Date.now();
    
    // Dispatch event to track request start for timer component
    window.dispatchEvent(new CustomEvent('webhookRequestStart', {
      detail: {
        requestId: `request-${Date.now()}`,
        startTime: requestStartTime,
        timeout: timeoutMs
      }
    }));
    
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
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Dispatch event to track request end
    window.dispatchEvent(new CustomEvent('webhookRequestEnd', {
      detail: {
        requestId: `request-${requestStartTime}`,
        duration: Date.now() - requestStartTime,
        status: response.status
      }
    }));
    
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
    // Dispatch event to track request error
    window.dispatchEvent(new CustomEvent('webhookRequestError', {
      detail: {
        error: error instanceof Error ? error.message : 'Unknown error',
        isTimeout: error instanceof DOMException && error.name === 'AbortError'
      }
    }));
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.error('Webhook request timed out', { url: webhookUrl }, { module: 'webhook' });
      logWebhookActivity(webhookUrl, 'ERROR', { message: 'Request timed out' });
      throw new Error('Webhook request timed out after ' + (parseInt(webhookUrlCache['webhook_timeout'] || '300000') / 1000) + ' seconds');
    }
    
    logger.error('Webhook request failed', error, { module: 'webhook' });
    logWebhookActivity(webhookUrl, 'ERROR', error);
    throw error;
  }
};

// Separate function for debug-only messages
export const sendDebugWebhookMessage = async (debugInfo: any): Promise<any> => {
  const webhookUrl = await getDebugWebhookUrl();
  
  // Validate URL before using
  if (!isValidWebhookUrl(webhookUrl)) {
    logger.error('Invalid debug webhook URL', { url: webhookUrl }, { module: 'debug' });
    return { error: true, message: 'Invalid debug webhook URL' };
  }
  
  try {
    // Add request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...debugInfo,
        timestamp: new Date().toISOString(),
      }),
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
      logger.error('Debug webhook request timed out', { url: webhookUrl }, { module: 'debug' });
      return { error: true, message: 'Request timed out' };
    }
    
    logger.error('Debug webhook request failed', error, { module: 'debug' });
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
