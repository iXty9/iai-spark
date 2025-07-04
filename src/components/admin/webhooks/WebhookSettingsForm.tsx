
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CardContent } from '@/components/ui/card';
import { Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateAppSetting } from '@/services/admin/settingsService';
import { WebhookUrlFormField } from './WebhookUrlFormField';
import { WebhookStatusChecker } from './WebhookStatusChecker';
import { 
  WebhookSettings, 
  WebhookFormErrors, 
  validateWebhookSettings 
} from './WebhookValidation';

interface WebhookSettingsFormProps {
  initialSettings: WebhookSettings;
}

export function WebhookSettingsForm({ initialSettings }: WebhookSettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebhookSettings>(initialSettings);
  const [errors, setErrors] = useState<WebhookFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name as keyof WebhookFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSave = async () => {
    // Validate all URLs
    const newErrors = validateWebhookSettings(settings);
    
    // If there are errors, don't proceed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Please fix the errors before saving.",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await updateAppSetting('authenticated_webhook_url', settings.authenticated_webhook_url);
      await updateAppSetting('anonymous_webhook_url', settings.anonymous_webhook_url);
      await updateAppSetting('debug_webhook_url', settings.debug_webhook_url);
      await updateAppSetting('thumbs_up_webhook_url', settings.thumbs_up_webhook_url);
      await updateAppSetting('thumbs_down_webhook_url', settings.thumbs_down_webhook_url);
      await updateAppSetting('user_signup_webhook_url', settings.user_signup_webhook_url);
      
      toast({
        title: "Webhook settings saved",
        description: "Your webhook settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save webhook settings",
        description: "There was an error saving the webhook settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CardContent className="pt-6">
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Webhook URLs must use HTTPS for security. Chat webhooks inject messages into conversations.
          Toast notifications are configured in App Settings {/* Real-time Messaging */}.
        </AlertDescription>
      </Alert>

      <WebhookStatusChecker settings={settings} />
      
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Chat Message Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            These webhooks inject messages directly into user chat conversations.
          </p>
          
          <WebhookUrlFormField
            id="authenticated_webhook_url"
            name="authenticated_webhook_url"
            label="Authenticated Chat Webhook URL"
            value={settings.authenticated_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/authenticated"
            error={errors.authenticated_webhook_url}
          />
          
          <WebhookUrlFormField
            id="anonymous_webhook_url"
            name="anonymous_webhook_url"
            label="Anonymous Chat Webhook URL"
            value={settings.anonymous_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/anonymous"
            error={errors.anonymous_webhook_url}
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">System & Debug Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            These webhooks handle system events and user interactions.
          </p>
          
          <WebhookUrlFormField
            id="debug_webhook_url"
            name="debug_webhook_url"
            label="Debug Webhook URL"
            value={settings.debug_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/debug"
            error={errors.debug_webhook_url}
          />
          
          <WebhookUrlFormField
            id="thumbs_up_webhook_url"
            name="thumbs_up_webhook_url"
            label="Thumbs Up Feedback Webhook URL"
            value={settings.thumbs_up_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/thumbs-up"
            error={errors.thumbs_up_webhook_url}
          />
          
          <WebhookUrlFormField
            id="thumbs_down_webhook_url"
            name="thumbs_down_webhook_url"
            label="Thumbs Down Feedback Webhook URL"
            value={settings.thumbs_down_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/thumbs-down"
            error={errors.thumbs_down_webhook_url}
          />
          
          <WebhookUrlFormField
            id="user_signup_webhook_url"
            name="user_signup_webhook_url"
            label="User Signup Webhook URL"
            value={settings.user_signup_webhook_url}
            onChange={handleChange}
            placeholder="https://your-domain.com/webhook/user-signup"
            error={errors.user_signup_webhook_url}
          />
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save Webhook Settings'}
        </Button>
      </div>
    </CardContent>
  );
}
