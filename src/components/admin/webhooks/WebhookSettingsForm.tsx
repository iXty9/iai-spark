
import React, { useState } from 'react';
import { CardContent, Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { WebhookSettings, validateWebhookSettings } from './WebhookValidation';
import { WebhookUrlFormField } from './WebhookUrlFormField';
import { WebhookStatusChecker } from './WebhookStatusChecker';
import { updateAppSetting } from '@/services/admin/settingsService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WebhookSettingsFormProps {
  initialSettings: WebhookSettings;
}

export function WebhookSettingsForm({ initialSettings }: WebhookSettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebhookSettings>(initialSettings);
  const [errors, setErrors] = useState<any>({});
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAuthToggle = (webhookName: string, checked: boolean) => {
    const authKey = `${webhookName}_use_auth`;
    setSettings(prev => ({ ...prev, [authKey]: checked }));
  };

  const generateRandomToken = () => {
    setSettings(prev => ({ ...prev, webhook_auth_header_value: crypto.randomUUID() }));
    setShowToken(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(settings.webhook_auth_header_value);
      toast({ title: "Copied!", description: "Token copied to clipboard" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to copy to clipboard" });
    }
  };

  const handleSave = async () => {
    const newErrors = validateWebhookSettings(settings);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ variant: "destructive", title: "Validation failed", description: "Please fix the errors before saving." });
      return;
    }
    
    try {
      setIsSaving(true);
      await updateAppSetting('authenticated_webhook_url', settings.authenticated_webhook_url);
      await updateAppSetting('anonymous_webhook_url', settings.anonymous_webhook_url);
      await updateAppSetting('debug_webhook_url', settings.debug_webhook_url);
      await updateAppSetting('thumbs_up_webhook_url', settings.thumbs_up_webhook_url);
      await updateAppSetting('thumbs_down_webhook_url', settings.thumbs_down_webhook_url);
      await updateAppSetting('user_signup_webhook_url', settings.user_signup_webhook_url);
      await updateAppSetting('chat_recall_webhook_url', settings.chat_recall_webhook_url);
      await updateAppSetting('webhook_auth_header_name', settings.webhook_auth_header_name);
      await updateAppSetting('webhook_auth_header_value', settings.webhook_auth_header_value);
      await updateAppSetting('authenticated_webhook_url_use_auth', settings.authenticated_webhook_url_use_auth.toString());
      await updateAppSetting('anonymous_webhook_url_use_auth', settings.anonymous_webhook_url_use_auth.toString());
      await updateAppSetting('debug_webhook_url_use_auth', settings.debug_webhook_url_use_auth.toString());
      await updateAppSetting('thumbs_up_webhook_url_use_auth', settings.thumbs_up_webhook_url_use_auth.toString());
      await updateAppSetting('thumbs_down_webhook_url_use_auth', settings.thumbs_down_webhook_url_use_auth.toString());
      await updateAppSetting('user_signup_webhook_url_use_auth', settings.user_signup_webhook_url_use_auth.toString());
      await updateAppSetting('chat_recall_webhook_url_use_auth', settings.chat_recall_webhook_url_use_auth.toString());
      toast({ title: "Success", description: "Webhook settings saved successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save webhook settings" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CardContent className="space-y-6 pt-6">
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Header Authentication</CardTitle>
          <CardDescription>Configure a shared secret header for webhook security. Enable per webhook below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook_auth_header_name">Header Name</Label>
            <Input id="webhook_auth_header_name" name="webhook_auth_header_name" value={settings.webhook_auth_header_name} onChange={handleChange} placeholder="X-Webhook-Token" />
            <p className="text-xs text-muted-foreground">Common: X-Webhook-Token, Authorization, X-API-Key</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook_auth_header_value">Header Value (Secret Token)</Label>
            <div className="flex gap-2">
              <Input 
                id="webhook_auth_header_value" 
                name="webhook_auth_header_value" 
                type={showToken ? "text" : "password"}
                value={settings.webhook_auth_header_value} 
                onChange={handleChange} 
                placeholder="Enter your secret token" 
                className="flex-1" 
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                disabled={!settings.webhook_auth_header_value}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={generateRandomToken}>Generate</Button>
            </div>
            <p className="text-xs text-muted-foreground">⚠️ Must match n8n workflow Header Auth value</p>
          </div>
          <Alert><Info className="h-4 w-4" /><AlertTitle>n8n Configuration</AlertTitle><AlertDescription><ol className="list-decimal list-inside space-y-1 text-sm"><li>Open n8n workflow → Webhook node</li><li>Authentication → Header Auth</li><li>Name: <code className="bg-muted px-1 rounded">{settings.webhook_auth_header_name}</code></li><li>Value: (secret token above)</li><li>Save workflow</li></ol></AlertDescription></Alert>
        </CardContent>
      </Card>
      <Alert><Info className="h-4 w-4" /><AlertDescription>Webhook URLs must use HTTPS. Leave empty to disable.</AlertDescription></Alert>
      <WebhookUrlFormField id="authenticated_webhook_url" name="authenticated_webhook_url" label="Authenticated User Webhook URL" value={settings.authenticated_webhook_url} error={errors.authenticated_webhook_url} placeholder="https://your-n8n.com/webhook/auth" onChange={handleChange} useAuth={settings.authenticated_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('authenticated_webhook_url', c)} />
      <WebhookUrlFormField id="anonymous_webhook_url" name="anonymous_webhook_url" label="Anonymous User Webhook URL" value={settings.anonymous_webhook_url} error={errors.anonymous_webhook_url} placeholder="https://your-n8n.com/webhook/anon" onChange={handleChange} useAuth={settings.anonymous_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('anonymous_webhook_url', c)} />
      <WebhookUrlFormField id="debug_webhook_url" name="debug_webhook_url" label="Debug Webhook URL" value={settings.debug_webhook_url} error={errors.debug_webhook_url} placeholder="https://your-n8n.com/webhook/debug" onChange={handleChange} useAuth={settings.debug_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('debug_webhook_url', c)} />
      <WebhookUrlFormField id="thumbs_up_webhook_url" name="thumbs_up_webhook_url" label="Thumbs Up Webhook URL" value={settings.thumbs_up_webhook_url} error={errors.thumbs_up_webhook_url} placeholder="https://your-n8n.com/webhook/thumbs-up" onChange={handleChange} useAuth={settings.thumbs_up_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('thumbs_up_webhook_url', c)} />
      <WebhookUrlFormField id="thumbs_down_webhook_url" name="thumbs_down_webhook_url" label="Thumbs Down Webhook URL" value={settings.thumbs_down_webhook_url} error={errors.thumbs_down_webhook_url} placeholder="https://your-n8n.com/webhook/thumbs-down" onChange={handleChange} useAuth={settings.thumbs_down_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('thumbs_down_webhook_url', c)} />
      <WebhookUrlFormField id="user_signup_webhook_url" name="user_signup_webhook_url" label="User Signup Webhook URL" value={settings.user_signup_webhook_url} error={errors.user_signup_webhook_url} placeholder="https://your-n8n.com/webhook/signup" onChange={handleChange} useAuth={settings.user_signup_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('user_signup_webhook_url', c)} />
      <WebhookUrlFormField id="chat_recall_webhook_url" name="chat_recall_webhook_url" label="Chat Recall Webhook URL" value={settings.chat_recall_webhook_url} error={errors.chat_recall_webhook_url} placeholder="https://your-n8n.com/webhook/chat-recall" onChange={handleChange} useAuth={settings.chat_recall_webhook_url_use_auth} onAuthToggle={(c) => handleAuthToggle('chat_recall_webhook_url', c)} />
      <WebhookStatusChecker settings={settings} />
      <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Webhook Settings'}</Button></div>
    </CardContent>
  );
}
