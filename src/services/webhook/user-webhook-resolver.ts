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
  logger.debug('[CustomWebhook] Fetching user webhook config', { userId: userId.slice(0, 8) }, { module: 'webhook' });
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('webhook_url, custom_webhook_enabled, custom_webhook_use_auth, custom_webhook_auth_header_name, custom_webhook_auth_header_value')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('[CustomWebhook] Failed to fetch user webhook config', { 
        userId: userId.slice(0, 8), 
        errorMessage: error.message,
        errorCode: error.code 
      }, { module: 'webhook' });
      return null;
    }

    if (!data) {
      logger.warn('[CustomWebhook] No profile data found', { userId: userId.slice(0, 8) }, { module: 'webhook' });
      return null;
    }

    // Log detailed config info for debugging
    logger.debug('[CustomWebhook] Config loaded from DB', {
      userId: userId.slice(0, 8),
      enabled: data.custom_webhook_enabled,
      hasUrl: !!data.webhook_url,
      urlPrefix: data.webhook_url?.slice(0, 40),
      useAuth: data.custom_webhook_use_auth,
      hasAuthHeaderName: !!data.custom_webhook_auth_header_name,
      hasAuthHeaderValue: !!data.custom_webhook_auth_header_value
    }, { module: 'webhook' });

    return {
      webhookUrl: data.webhook_url,
      enabled: data.custom_webhook_enabled ?? false,
      useAuth: data.custom_webhook_use_auth ?? false,
      authHeaderName: data.custom_webhook_auth_header_name,
      authHeaderValue: data.custom_webhook_auth_header_value,
    };
  } catch (error) {
    logger.error('[CustomWebhook] Unexpected error fetching config', error, { module: 'webhook' });
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
  logger.debug('[CustomWebhook] Resolving webhook URL', { 
    hasUserId: !!userId,
    userIdPrefix: userId?.slice(0, 8),
    globalUrlPrefix: globalWebhookUrl.slice(0, 40)
  }, { module: 'webhook' });

  // No user ID means we use global
  if (!userId) {
    logger.debug('[CustomWebhook] No userId provided, using global', { module: 'webhook' });
    return { url: globalWebhookUrl, isCustom: false };
  }

  try {
    const config = await getUserWebhookConfig(userId);

    // Log the decision-making process
    const urlValid = config?.webhookUrl ? isValidWebhookUrl(config.webhookUrl) : false;
    logger.debug('[CustomWebhook] Resolution decision', {
      userId: userId.slice(0, 8),
      configExists: !!config,
      enabled: config?.enabled,
      hasUrl: !!config?.webhookUrl,
      urlValid
    }, { module: 'webhook' });

    // Check if user has custom webhook enabled and configured
    if (config && config.enabled && config.webhookUrl && urlValid) {
      logger.info('[CustomWebhook] ✓ Using CUSTOM webhook', { 
        userId: userId.slice(0, 8),
        urlPrefix: config.webhookUrl.slice(0, 40)
      }, { module: 'webhook' });
      return { url: config.webhookUrl, isCustom: true };
    }

    // Log why we're falling back
    if (config && config.enabled && config.webhookUrl && !urlValid) {
      logger.warn('[CustomWebhook] Custom URL invalid, falling back to global', {
        userId: userId.slice(0, 8),
        url: config.webhookUrl
      }, { module: 'webhook' });
    } else {
      logger.debug('[CustomWebhook] Using GLOBAL webhook (custom not configured/enabled)', {
        userId: userId.slice(0, 8)
      }, { module: 'webhook' });
    }

    // Fall back to global webhook
    return { url: globalWebhookUrl, isCustom: false };
  } catch (error) {
    logger.error('[CustomWebhook] Error resolving, falling back to global', error, { module: 'webhook' });
    return { url: globalWebhookUrl, isCustom: false };
  }
}

/**
 * Get auth headers for a user's custom webhook
 */
export async function getUserWebhookAuthHeaders(userId: string): Promise<Record<string, string>> {
  logger.debug('[CustomWebhook] Getting auth headers', { userId: userId.slice(0, 8) }, { module: 'webhook' });
  
  try {
    const config = await getUserWebhookConfig(userId);

    if (!config || !config.enabled || !config.useAuth) {
      logger.debug('[CustomWebhook] Auth headers not applicable', {
        userId: userId.slice(0, 8),
        configExists: !!config,
        enabled: config?.enabled,
        useAuth: config?.useAuth
      }, { module: 'webhook' });
      return {};
    }

    if (!config.authHeaderName || !config.authHeaderValue) {
      logger.warn('[CustomWebhook] Auth enabled but missing header name/value', {
        userId: userId.slice(0, 8),
        hasName: !!config.authHeaderName,
        hasValue: !!config.authHeaderValue
      }, { module: 'webhook' });
      return {};
    }

    logger.debug('[CustomWebhook] Auth headers configured', {
      userId: userId.slice(0, 8),
      headerName: config.authHeaderName
    }, { module: 'webhook' });

    return {
      [config.authHeaderName]: config.authHeaderValue
    };
  } catch (error) {
    logger.error('[CustomWebhook] Failed to get auth headers', error, { module: 'webhook' });
    return {};
  }
}
