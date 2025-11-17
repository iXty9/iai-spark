import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

export interface WebhookAuthHeaders {
  [key: string]: string;
}

export type WebhookType = 
  | 'authenticated_webhook_url' 
  | 'anonymous_webhook_url' 
  | 'debug_webhook_url' 
  | 'thumbs_up_webhook_url' 
  | 'thumbs_down_webhook_url' 
  | 'user_signup_webhook_url';

/**
 * Get authentication headers for a specific webhook type
 */
export const getWebhookAuthHeaders = async (
  webhookType: WebhookType
): Promise<WebhookAuthHeaders> => {
  try {
    const settings = await fetchAppSettings();
    
    // Check if this webhook should use auth
    const useAuthKey = `${webhookType}_use_auth`;
    const shouldUseAuth = settings[useAuthKey] === 'true';
    
    if (!shouldUseAuth) {
      return {}; // No auth headers
    }
    
    // Get header configuration
    const headerName = settings.webhook_auth_header_name || 'X-Webhook-Token';
    const headerValue = settings.webhook_auth_header_value;
    
    if (!headerValue) {
      logger.warn(`Webhook ${webhookType} is configured to use auth but no header value is set`, 
        { module: 'webhook-auth' });
      return {};
    }
    
    return {
      [headerName]: headerValue
    };
    
  } catch (error) {
    logger.error('Failed to get webhook auth headers', error, { module: 'webhook-auth' });
    return {};
  }
};
