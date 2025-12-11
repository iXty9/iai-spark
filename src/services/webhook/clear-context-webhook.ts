import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

/**
 * Sends a webhook notification when a user clears their chat
 * This allows n8n to clear the conversation memory/context
 */
export const sendClearContextWebhook = async (
  userId: string,
  sessionId: string
): Promise<boolean> => {
  try {
    const settings = await fetchAppSettings();
    const webhookUrl = settings.clear_context_webhook_url;
    
    if (!webhookUrl) {
      logger.debug('Clear context webhook not configured, skipping', {}, { module: 'clear-context-webhook' });
      return true; // Not an error, just not configured
    }
    
    const useAuth = settings.clear_context_webhook_url_use_auth === 'true';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add auth headers if configured
    if (useAuth && settings.webhook_auth_header_name && settings.webhook_auth_header_value) {
      headers[settings.webhook_auth_header_name] = settings.webhook_auth_header_value;
    }
    
    const payload = {
      action: 'clear_context',
      user_id: userId,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Sending clear context webhook', {
      userId,
      sessionId,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    }, { module: 'clear-context-webhook' });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      logger.error('Clear context webhook failed', {
        status: response.status,
        statusText: response.statusText
      }, { module: 'clear-context-webhook' });
      return false;
    }
    
    logger.info('Clear context webhook sent successfully', {
      userId,
      sessionId
    }, { module: 'clear-context-webhook' });
    
    return true;
  } catch (error) {
    logger.error('Error sending clear context webhook', error, { module: 'clear-context-webhook' });
    return false;
  }
};
