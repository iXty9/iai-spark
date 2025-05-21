
// Import the security utility directly
import { isValidUrl } from '@/utils/security';

/**
 * Type for webhook settings
 */
export interface WebhookSettingsType {
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  debug_webhook_url?: string;
  [key: string]: string | undefined;
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): boolean {
  return isValidUrl(url);
}

/**
 * Validate webhook settings form
 */
export function validateWebhookSettings(formData: WebhookSettingsType): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // Validate all URL fields
  Object.entries(formData).forEach(([key, value]) => {
    if (key.includes('webhook_url') && value) {
      if (!validateWebhookUrl(value)) {
        errors[key] = "Please enter a valid URL";
      }
    }
  });
  
  return errors;
}

/**
 * Interface for form errors
 */
export interface WebhookFormErrors {
  url?: string;
  authenticated_webhook_url?: string;
  anonymous_webhook_url?: string;
  debug_webhook_url?: string;
  [key: string]: string | undefined;
}

/**
 * Export settings namespace for organization
 */
export const WebhookSettings = {
  validate: validateWebhookSettings
};
