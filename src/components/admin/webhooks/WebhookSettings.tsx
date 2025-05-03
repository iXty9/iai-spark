
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { WebhookSettingsForm } from './WebhookSettingsForm';
import { WebhookSettings as WebhookSettingsType } from './WebhookValidation';

export function WebhookSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebhookSettingsType>({
    authenticated_webhook_url: '',
    anonymous_webhook_url: '',
    debug_webhook_url: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await fetchAppSettings();
        setSettings({
          authenticated_webhook_url: appSettings['authenticated_webhook_url'] || '',
          anonymous_webhook_url: appSettings['anonymous_webhook_url'] || '',
          debug_webhook_url: appSettings['debug_webhook_url'] || ''
        });
      } catch (error) {
        console.error('Error loading webhook settings:', error);
        toast({
          variant: "destructive",
          title: "Failed to load webhook settings",
          description: "There was an error loading the webhook settings.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  if (isLoading) {
    return <div>Loading webhook settings...</div>;
  }

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <WebhookSettingsForm initialSettings={settings} />
    </Card>
  );
}
