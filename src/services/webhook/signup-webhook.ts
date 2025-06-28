
import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { isValidWebhookUrl } from './cache/url-cache';

interface UserSignupData {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  timestamp: string;
}

/**
 * Send user signup data to the configured webhook URL
 */
export const sendUserSignupWebhook = async (userData: UserSignupData): Promise<void> => {
  try {
    // Get the signup webhook URL from settings
    const settings = await fetchAppSettings();
    const webhookUrl = settings.user_signup_webhook_url;
    
    // If no webhook URL is configured, skip silently
    if (!webhookUrl) {
      logger.info('No user signup webhook URL configured, skipping webhook call', { module: 'signup-webhook' });
      return;
    }
    
    // Validate the webhook URL
    if (!isValidWebhookUrl(webhookUrl)) {
      logger.error('Invalid user signup webhook URL', { url: webhookUrl }, { module: 'signup-webhook' });
      return;
    }
    
    logger.info('Sending user signup webhook', { 
      email: userData.email.substring(0, 3) + '***',
      username: userData.username,
      url: webhookUrl 
    }, { module: 'signup-webhook' });
    
    // Prepare the payload
    const payload = {
      event: 'user_signup',
      user: {
        email: userData.email,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone_number: userData.phoneNumber
      },
      timestamp: userData.timestamp
    };
    
    // Send the webhook with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      logger.error('User signup webhook failed', { 
        status: response.status, 
        statusText: response.statusText 
      }, { module: 'signup-webhook' });
      return;
    }
    
    logger.info('User signup webhook sent successfully', { 
      status: response.status 
    }, { module: 'signup-webhook' });
    
  } catch (error) {
    // Log the error but don't throw it - we don't want webhook failures to block user signup
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.error('User signup webhook timed out', {}, { module: 'signup-webhook' });
    } else {
      logger.error('User signup webhook failed', error, { module: 'signup-webhook' });
    }
  }
};
