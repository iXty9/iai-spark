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
import { getWebhookAuthHeaders } from './auth-header-builder';
import { getSessionId } from '@/services/chat/session-id-service';
import { resolveUserWebhookUrl, getUserWebhookAuthHeaders } from './user-webhook-resolver';

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
 * Extract structured attachments embedded in the message and return
 * a clean message without the attachment blocks plus a parsed list
 */
interface ParsedAttachment {
  name: string;
  mime: string;
  data: string; // base64 string (no data: prefix)
  size?: number;
}

const extractAttachmentsFromMessage = (msg: string): { text: string; attachments: ParsedAttachment[] } => {
  const attachments: ParsedAttachment[] = [];
  if (!msg) return { text: msg, attachments };

  const regex = /\[attachment\s+name="([^"]+)"\s+mime="([^"]+)"\]\s*([\s\S]*?)\s*\[\/attachment\]/g;
  let clean = msg;

  clean = clean.replace(regex, (_match, name, mime, dataUrl) => {
    let base64 = dataUrl?.trim() || '';
    let parsedMime = mime;
    if (base64.startsWith('data:')) {
      const commaIdx = base64.indexOf(',');
      if (commaIdx > -1) {
        const header = base64.substring(5, commaIdx); // after 'data:'
        const headerMime = header.split(';')[0];
        parsedMime = parsedMime || headerMime;
        base64 = base64.substring(commaIdx + 1);
      }
    }

    // Estimate size from base64
    const size = Math.round((base64.length * 3) / 4);

    attachments.push({ name, mime: parsedMime || 'application/octet-stream', data: base64, size });
    return '';
  });

  return { text: clean.trim(), attachments };
};

/**
 * Separate attachments into images and non-image data for n8n payload
 */
const categorizeAttachments = (attachments: ParsedAttachment[]) => {
  const images: ParsedAttachment[] = [];
  const documents: ParsedAttachment[] = [];

  for (const att of attachments) {
    if (att.mime.startsWith('image/')) {
      images.push(att);
    } else {
      documents.push(att);
    }
  }

  return { images, documents };
};

/**
 * Sends a message to the appropriate webhook based on authentication status
 * Returns both the request payload and response for complete data preservation
 */
export const sendWebhookMessage = async (
  message: string,
  isAuthenticated: boolean,
  userInfo?: { id?: string; username?: string; first_name?: string; last_name?: string } | null,
  externalController?: AbortController,
  location?: { latitude: number; longitude: number } | null
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
  
  // Get the base global webhook URL
  const globalWebhookUrl = await getWebhookUrl(isAuthenticated);
  
  // For authenticated users, check if they have a custom webhook configured
  let webhookUrl = globalWebhookUrl;
  let isCustomWebhook = false;
  
  logger.debug('[Webhook] Starting URL resolution', {
    isAuthenticated,
    hasUserId: !!userInfo?.id,
    userIdPrefix: userInfo?.id?.slice(0, 8),
    globalUrlPrefix: globalWebhookUrl.slice(0, 40)
  }, { module: 'webhook' });
  
  if (isAuthenticated && userInfo?.id) {
    const resolved = await resolveUserWebhookUrl(userInfo.id, globalWebhookUrl);
    webhookUrl = resolved.url;
    isCustomWebhook = resolved.isCustom;
    
    logger.debug('[Webhook] URL resolution complete', {
      isCustomWebhook,
      finalUrlPrefix: webhookUrl.slice(0, 40)
    }, { module: 'webhook' });
  }
  
  // Get configurable timeout
  const timeoutMs = await getWebhookTimeout(isAuthenticated);
  
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
  
  // Get auth headers - use user-specific headers for custom webhooks, otherwise global
  let authHeaders: Record<string, string> = {};
  if (isCustomWebhook && userInfo?.id) {
    logger.debug('[Webhook] Getting custom auth headers', { userIdPrefix: userInfo.id.slice(0, 8) }, { module: 'webhook' });
    authHeaders = await getUserWebhookAuthHeaders(userInfo.id);
  } else {
    const webhookType = isAuthenticated ? 'authenticated_webhook_url' : 'anonymous_webhook_url';
    logger.debug('[Webhook] Getting global auth headers', { webhookType }, { module: 'webhook' });
    authHeaders = await getWebhookAuthHeaders(webhookType);
  }
  
  logger.debug('[Webhook] Auth headers resolved', {
    headerCount: Object.keys(authHeaders).length,
    headerNames: Object.keys(authHeaders)
  }, { module: 'webhook' });
  
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
    
    // Prepare message - extract attachments and categorize them
    const { text: cleanMessage, attachments } = extractAttachmentsFromMessage(message);
    const { images, documents } = categorizeAttachments(attachments);
    
    // Build payload with separated image and document fields for n8n
    const payload: any = {
      message: cleanMessage,
      sender: senderName,
      timestamp: new Date().toISOString(),
      isAuthenticated: isAuthenticated,
      sessionCall: webhookSessionTracker.callsThisSession,
      user_id: userInfo?.id || null,
      sessionId: getSessionId(userInfo?.id || null)
    };

    // Add images array for n8n's AI vision passthrough
    // Format: [{ name, mime, data (base64) }]
    if (images.length > 0) {
      payload.images = images.map(img => ({
        name: img.name,
        mime: img.mime,
        data: img.data,
        size: img.size
      }));
    }

    // Add data field for non-image attachments (PDFs, text, JSON, etc.)
    // n8n can process these through binary data handling
    if (documents.length > 0) {
      payload.data = documents.map(doc => ({
        name: doc.name,
        mime: doc.mime,
        data: doc.data,
        size: doc.size
      }));
    }

    // Include location if available (authenticated users only for privacy)
    if (isAuthenticated && location) {
      payload.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }

    // Log right before sending
    logger.info('[Webhook] Sending request', {
      isCustomWebhook,
      urlPrefix: webhookUrl.slice(0, 50),
      hasAuthHeaders: Object.keys(authHeaders).length > 0,
      payloadKeys: Object.keys(payload)
    }, { module: 'webhook' });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    logger.debug('[Webhook] Response received', {
      status: response.status,
      ok: response.ok,
      isCustomWebhook
    }, { module: 'webhook' });
    
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
