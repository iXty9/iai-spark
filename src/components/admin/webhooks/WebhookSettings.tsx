
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WebhookSettingsForm } from './WebhookSettingsForm';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { WebhookSettings as WebhookSettingsType } from './WebhookValidation';

export function WebhookSettings() {
  const [webhookSettings, setWebhookSettings] = useState<WebhookSettingsType>({
    authenticated_webhook_url: '',
    anonymous_webhook_url: '',
    debug_webhook_url: '',
    thumbs_up_webhook_url: '',
    thumbs_down_webhook_url: '',
    user_signup_webhook_url: '',
    webhook_auth_header_name: 'X-Webhook-Token',
    webhook_auth_header_value: '',
    authenticated_webhook_url_use_auth: false,
    anonymous_webhook_url_use_auth: false,
    debug_webhook_url_use_auth: false,
    thumbs_up_webhook_url_use_auth: false,
    thumbs_down_webhook_url_use_auth: false,
    user_signup_webhook_url_use_auth: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWebhookSettings();
  }, []);

  const loadWebhookSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchAppSettings();
      
      setWebhookSettings({
        authenticated_webhook_url: settings.authenticated_webhook_url || '',
        anonymous_webhook_url: settings.anonymous_webhook_url || '',
        debug_webhook_url: settings.debug_webhook_url || '',
        thumbs_up_webhook_url: settings.thumbs_up_webhook_url || '',
        thumbs_down_webhook_url: settings.thumbs_down_webhook_url || '',
        user_signup_webhook_url: settings.user_signup_webhook_url || '',
        webhook_auth_header_name: settings.webhook_auth_header_name || 'X-Webhook-Token',
        webhook_auth_header_value: settings.webhook_auth_header_value || '',
        authenticated_webhook_url_use_auth: settings.authenticated_webhook_url_use_auth === 'true',
        anonymous_webhook_url_use_auth: settings.anonymous_webhook_url_use_auth === 'true',
        debug_webhook_url_use_auth: settings.debug_webhook_url_use_auth === 'true',
        thumbs_up_webhook_url_use_auth: settings.thumbs_up_webhook_url_use_auth === 'true',
        thumbs_down_webhook_url_use_auth: settings.thumbs_down_webhook_url_use_auth === 'true',
        user_signup_webhook_url_use_auth: settings.user_signup_webhook_url_use_auth === 'true'
      });
    } catch (error) {
      console.error('Error loading webhook settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading webhook settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Configure webhook URLs for different types of events. Chat webhooks inject messages into user conversations.
            Toast notification webhooks are configured in App Settings &gt; Real-time Messaging.
          </CardDescription>
        </CardHeader>
        <WebhookSettingsForm initialSettings={webhookSettings} />
      </Card>
    </div>
  );
}
