
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { getAppSettingsMap } from '@/services/admin/settingsService';
import { isValidWebhookUrl } from './cache/url-cache';
import { webhookRateLimiter } from './utils/rate-limiter';
import { 
  logWebhookActivity, 
  dispatchWebhookRequestStart, 
  dispatchWebhookRequestEnd,
  dispatchWebhookRequestError
} from './utils/webhook-events';

export type FeedbackType = 'thumbs_up' | 'thumbs_down';

/**
 * Get the webhook URL for feedback based on type
 */
const getFeedbackWebhookUrl = async (feedbackType: FeedbackType): Promise<string> => {
  try {
    const settings = await getAppSettingsMap();
    const key = feedbackType === 'thumbs_up' ? 'thumbs_up_webhook_url' : 'thumbs_down_webhook_url';
    return settings[key] || '';
  } catch (error) {
    logger.error('Failed to get feedback webhook URL', error, { module: 'feedback-webhook' });
    return '';
  }
};

/**
 * Send feedback to the appropriate webhook
 */
export const sendFeedbackWebhook = async (
  feedbackType: FeedbackType,
  messageContent: string,
  isAuthenticated: boolean,
  userInfo?: { username?: string; first_name?: string; last_name?: string } | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Apply rate limiting for feedback
    const rateLimitKey = `feedback_${isAuthenticated ? 'authenticated' : 'anonymous'}`;
    if (!webhookRateLimiter.checkLimit(rateLimitKey)) {
      logger.warn('Feedback webhook rate limit exceeded', { feedbackType, isAuthenticated }, { module: 'feedback-webhook' });
      return { success: false, error: 'Rate limit exceeded. Please wait before sending more feedback.' };
    }

    const webhookUrl = await getFeedbackWebhookUrl(feedbackType);
    
    if (!webhookUrl) {
      logger.warn('No feedback webhook URL configured', { feedbackType }, { module: 'feedback-webhook' });
      return { success: false, error: 'Feedback webhook not configured' };
    }

    // Validate URL
    if (!isValidWebhookUrl(webhookUrl)) {
      logger.error('Invalid feedback webhook URL', { url: webhookUrl, feedbackType }, { module: 'feedback-webhook' });
      return { success: false, error: 'Invalid webhook URL configuration' };
    }

    emitDebugEvent({
      lastAction: `Sending ${feedbackType} feedback`,
      isLoading: true
    });

    logWebhookActivity(webhookUrl, 'REQUEST_SENT');

    // Add request timeout (10 seconds for feedback)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const requestStartTime = Date.now();
    const requestId = `feedback-${feedbackType}-${requestStartTime}`;
    
    // Dispatch event to track request start
    dispatchWebhookRequestStart(requestId, 10000);
    
    // Determine sender name
    let senderName;
    if (isAuthenticated) {
      if (userInfo?.username) {
        senderName = userInfo.username;
      } else if (userInfo?.first_name) {
        senderName = userInfo.first_name;
      } else {
        senderName = 'Authenticated User';
      }
    } else {
      senderName = 'Anonymous';
    }
    
    // Prepare feedback payload - minimal but informative
    const payload = {
      feedback_type: feedbackType,
      message_content: messageContent.substring(0, 1000), // Limit message content
      sender: senderName,
      timestamp: new Date().toISOString(),
      is_authenticated: isAuthenticated,
      user_agent: navigator.userAgent,
      page_url: window.location.href
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
      logger.error('Feedback webhook failed', { status: response.status, feedbackType }, { module: 'feedback-webhook' });
      return { success: false, error: `Webhook responded with status: ${response.status}` };
    }
    
    logWebhookActivity(webhookUrl, 'RESPONSE_RECEIVED');
    
    emitDebugEvent({
      lastAction: `${feedbackType} feedback sent successfully`,
      isLoading: false
    });
    
    logger.info('Feedback sent successfully', { feedbackType, isAuthenticated }, { module: 'feedback-webhook' });
    return { success: true };
    
  } catch (error) {
    // Handle different error types
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    
    // Dispatch event to track request error
    dispatchWebhookRequestError(error, isTimeout);
    
    if (isTimeout) {
      logger.error('Feedback webhook timed out', { feedbackType }, { module: 'feedback-webhook' });
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    
    logger.error('Feedback webhook failed', error, { module: 'feedback-webhook' });
    return { success: false, error: 'Failed to send feedback. Please try again.' };
  }
};
