
import { z } from 'zod';

// More permissive schema for webhook URL validation - allows any HTTPS URL
export const webhookUrlSchema = z.string().refine(
  (url) => {
    if (!url) return true; // Allow empty URLs
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:'; // Only require HTTPS, no domain restriction
    } catch {
      return false;
    }
  },
  {
    message: 'URL must be a valid HTTPS URL',
  }
);

export interface WebhookSettings {
  authenticated_webhook_url: string;
  anonymous_webhook_url: string;
  debug_webhook_url: string;
  thumbs_up_webhook_url: string;
  thumbs_down_webhook_url: string;
  user_signup_webhook_url: string;
}

export interface WebhookFormErrors {
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  debug_webhook_url?: string;
  thumbs_up_webhook_url?: string;
  thumbs_down_webhook_url?: string;
  user_signup_webhook_url?: string;
}

export const validateWebhookUrl = (name: string, value: string): string | null => {
  try {
    webhookUrlSchema.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid URL';
    }
    return 'Invalid URL';
  }
};

export const validateWebhookSettings = (settings: WebhookSettings): WebhookFormErrors => {
  const errors: WebhookFormErrors = {};
  
  Object.entries(settings).forEach(([key, value]) => {
    if (value) {
      const error = validateWebhookUrl(key, value);
      if (error && key in settings) {
        errors[key as keyof WebhookSettings] = error;
      }
    }
  });
  
  return errors;
};
