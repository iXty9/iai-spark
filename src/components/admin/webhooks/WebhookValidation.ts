
import { z } from 'zod';
import { isValidUrl } from '@/utils/security';

// Schema for webhook URL validation
export const webhookUrlSchema = z.string().refine(
  (url) => !url || isValidUrl(url, ['ixty.ai'], ['https:']),
  {
    message: 'URL must be a valid HTTPS URL from ixty.ai domain',
  }
);

export interface WebhookSettings {
  authenticated_webhook_url: string;
  anonymous_webhook_url: string;
  debug_webhook_url: string;
}

export interface WebhookFormErrors {
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  debug_webhook_url?: string;
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
