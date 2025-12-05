import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Eye, EyeOff, Copy, Info, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface UserWebhookSettings {
  webhook_url: string;
  custom_webhook_enabled: boolean;
  custom_webhook_auth_header_name: string;
  custom_webhook_auth_header_value: string;
  custom_webhook_use_auth: boolean;
}

interface UserWebhookConfigProps {
  settings: UserWebhookSettings;
  onChange: (settings: UserWebhookSettings) => void;
  urlError?: string;
}

export function UserWebhookConfig({ settings, onChange, urlError }: UserWebhookConfigProps) {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);

  const handleChange = (field: keyof UserWebhookSettings, value: string | boolean) => {
    onChange({ ...settings, [field]: value });
  };

  const generateRandomToken = () => {
    handleChange('custom_webhook_auth_header_value', crypto.randomUUID());
    setShowToken(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(settings.custom_webhook_auth_header_value);
      toast({ title: "Copied!", description: "Token copied to clipboard" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to copy to clipboard" });
    }
  };

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Webhook Settings
        </CardTitle>
        <CardDescription>
          Configure a custom webhook URL for this user. When disabled, the global authenticated webhook will be used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="custom-webhook-toggle" className="text-base">
              Enable Custom Webhook
            </Label>
            <p className="text-sm text-muted-foreground">
              {settings.custom_webhook_enabled 
                ? "Using custom webhook URL for this user" 
                : "Using global authenticated webhook URL"}
            </p>
          </div>
          <Switch
            id="custom-webhook-toggle"
            checked={settings.custom_webhook_enabled}
            onCheckedChange={(checked) => handleChange('custom_webhook_enabled', checked)}
          />
        </div>

        {!settings.custom_webhook_enabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Custom webhook is disabled. This user will use the global authenticated webhook URL configured in Admin Settings → Webhooks.
            </AlertDescription>
          </Alert>
        )}

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook_url">Custom Webhook URL</Label>
          <Input
            id="webhook_url"
            value={settings.webhook_url}
            onChange={(e) => handleChange('webhook_url', e.target.value)}
            placeholder="https://your-n8n.com/webhook/user-specific"
            disabled={!settings.custom_webhook_enabled}
            className={urlError ? 'border-destructive' : ''}
          />
          {urlError && <p className="text-sm text-destructive">{urlError}</p>}
          <p className="text-xs text-muted-foreground">
            Must be an HTTPS URL. Leave empty to disable custom webhook.
          </p>
        </div>

        {/* Authentication Section */}
        <Card className="bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              Header Authentication
            </CardTitle>
            <CardDescription className="text-sm">
              Configure authentication headers for this user's custom webhook.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Use Auth Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-auth-toggle" className="text-sm">
                  Use Header Authentication
                </Label>
              </div>
              <Switch
                id="use-auth-toggle"
                checked={settings.custom_webhook_use_auth}
                onCheckedChange={(checked) => handleChange('custom_webhook_use_auth', checked)}
                disabled={!settings.custom_webhook_enabled}
              />
            </div>

            {/* Header Name */}
            <div className="space-y-2">
              <Label htmlFor="header_name">Header Name</Label>
              <Input
                id="header_name"
                value={settings.custom_webhook_auth_header_name}
                onChange={(e) => handleChange('custom_webhook_auth_header_name', e.target.value)}
                placeholder="X-Webhook-Token"
                disabled={!settings.custom_webhook_enabled || !settings.custom_webhook_use_auth}
              />
              <p className="text-xs text-muted-foreground">
                Common: X-Webhook-Token, Authorization, X-API-Key
              </p>
            </div>

            {/* Header Value */}
            <div className="space-y-2">
              <Label htmlFor="header_value">Header Value (Secret Token)</Label>
              <div className="flex gap-2">
                <Input
                  id="header_value"
                  type={showToken ? "text" : "password"}
                  value={settings.custom_webhook_auth_header_value}
                  onChange={(e) => handleChange('custom_webhook_auth_header_value', e.target.value)}
                  placeholder="Enter secret token"
                  disabled={!settings.custom_webhook_enabled || !settings.custom_webhook_use_auth}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                  disabled={!settings.custom_webhook_enabled || !settings.custom_webhook_use_auth}
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  disabled={!settings.custom_webhook_enabled || !settings.custom_webhook_auth_header_value}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomToken}
                  disabled={!settings.custom_webhook_enabled || !settings.custom_webhook_use_auth}
                >
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
