
export interface WebhookSettings {
  authenticated_webhook_url: string;
  anonymous_webhook_url: string;
  debug_webhook_url: string;
  thumbs_up_webhook_url: string;
  thumbs_down_webhook_url: string;
  user_signup_webhook_url: string;
  toast_notification_webhook_url: string;
}

export interface WebhookFormErrors {
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  debug_webhook_url?: string;
  thumbs_up_webhook_url?: string;
  thumbs_down_webhook_url?: string;
  user_signup_webhook_url?: string;
  toast_notification_webhook_url?: string;
}

export function validateWebhookSettings(settings: WebhookSettings): WebhookFormErrors {
  const errors: WebhookFormErrors = {};
  
  // Helper function to validate URL format
  const validateUrl = (url: string, fieldName: keyof WebhookFormErrors) => {
    if (url.trim() === '') {
      return; // Empty URLs are allowed
    }
    
    try {
      const urlObj = new URL(url);
      
      // Must use HTTPS for security
      if (urlObj.protocol !== 'https:') {
        errors[fieldName] = 'Webhook URLs must use HTTPS for security';
        return;
      }
      
      // Basic hostname validation
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        errors[fieldName] = 'Invalid hostname in webhook URL';
        return;
      }
      
    } catch (error) {
      errors[fieldName] = 'Invalid URL format';
    }
  };
  
  // Validate each webhook URL
  validateUrl(settings.authenticated_webhook_url, 'authenticated_webhook_url');
  validateUrl(settings.anonymous_webhook_url, 'anonymous_webhook_url');
  validateUrl(settings.debug_webhook_url, 'debug_webhook_url');
  validateUrl(settings.thumbs_up_webhook_url, 'thumbs_up_webhook_url');
  validateUrl(settings.thumbs_down_webhook_url, 'thumbs_down_webhook_url');
  validateUrl(settings.user_signup_webhook_url, 'user_signup_webhook_url');
  validateUrl(settings.toast_notification_webhook_url, 'toast_notification_webhook_url');
  
  return errors;
}
