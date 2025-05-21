
// Import the security utility directly
import { isValidUrl } from '@/utils/security';

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): boolean {
  return isValidUrl(url);
}
