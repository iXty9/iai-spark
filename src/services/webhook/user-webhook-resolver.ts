import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { isValidWebhookUrl } from './cache/url-cache';

export interface UserWebhookConfig {
  webhookUrl: string | null;
  enabled: boolean;
  useAuth: boolean;
  authHeaderName: string | null;
  authHeaderValue: string | null;
}

/**
 * Fetch user's custom webhook configuration from their profile
 */
export async function getUserWebhookConfig(userId: string): Promise<UserWebhookConfig | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('webhook_url, custom_webhook_enabled, custom_webhook_use_auth, custom_webhook_auth_header_name, custom_webhook_auth_header_value')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to fetch user webhook config', error, { module: 'webhook' });
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      webhookUrl: data.webhook_url,
      enabled: data.custom_webhook_enabled ?? false,
      useAuth: data.custom_webhook_use_auth ?? false,
      authHeaderName: data.custom_webhook_auth_header_name,
      authHeaderValue: data.custom_webhook_auth_header_value,
    };
  } catch (error) {
    logger.error('Unexpected error fetching user webhook config', error, { module: 'webhook' });
    return null;
  }
}

/**
 * Resolve the webhook URL for a user - checks for custom webhook first, falls back to global
 * Returns the URL and whether it's a custom URL
 */
export async function resolveUserWebhookUrl(
  userId: string | undefined | null,
  globalWebhookUrl: string
): Promise<{ url: string; isCustom: boolean }> {
  // No user ID means we use global
  if (!userId) {
    return { url: globalWebhookUrl, isCustom: false };
  }

  try {
    const config = await getUserWebhookConfig(userId);

    // Check if user has custom webhook enabled and configured
    if (config && config.enabled && config.webhookUrl && isValidWebhookUrl(config.webhookUrl)) {
      logger.info('Using custom webhook for user', { userId: userId.slice(0, 8) }, { module: 'webhook' });
      return { url: config.webhookUrl, isCustom: true };
    }

    // Fall back to global webhook
    return { url: globalWebhookUrl, isCustom: false };
  } catch (error) {
    logger.error('Error resolving user webhook URL, falling back to global', error, { module: 'webhook' });
    return { url: globalWebhookUrl, isCustom: false };
  }
}

/**
 * Get auth headers for a user's custom webhook
 */
export async function getUserWebhookAuthHeaders(userId: string): Promise<Record<string, string>> {
  try {
    const config = await getUserWebhookConfig(userId);

    if (!config || !config.enabled || !config.useAuth) {
      return {};
    }

    if (!config.authHeaderName || !config.authHeaderValue) {
      logger.warn('User webhook auth enabled but missing header name/value', { module: 'webhook' });
      return {};
    }

    return {
      [config.authHeaderName]: config.authHeaderValue
    };
  } catch (error) {
    logger.error('Failed to get user webhook auth headers', error, { module: 'webhook' });
    return {};
  }
}
