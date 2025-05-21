
// Import the security utility directly
import { isValidUrl } from '@/utils/security';

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): boolean {
  return isValidUrl(url);
}

/**
 * Validate webhook settings form
 */
export function validateWebhookSettings(formData: any): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!formData.url) {
    errors.url = "Webhook URL is required";
  } else if (!validateWebhookUrl(formData.url)) {
    errors.url = "Please enter a valid URL";
  }
  
  return errors;
}

/**
 * Types for form errors
 */
export interface WebhookFormErrors {
  url?: string;
  [key: string]: string | undefined;
}

/**
 * Export settings component for imports in other files
 */
export const WebhookSettings = {
  validate: validateWebhookSettings
};
