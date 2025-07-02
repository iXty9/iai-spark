
import { useState, useEffect } from 'react';
import { supaToast } from '@/services/supa-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink } from 'lucide-react';
import { WebhookTester } from './webhooks/WebhookTester';

export function WebSocketSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [websocketEnabled, setWebsocketEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [toastWebhookUrl, setToastWebhookUrl] = useState('');

  // Generate the webhook URL based on current environment
  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321'
      : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
    return `${baseUrl}/functions/v1/proactive-message-webhook`;
  };

  // Generate the toast webhook URL
  const generateToastWebhookUrl = () => {
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321'
      : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
    return `${baseUrl}/functions/v1/toast-notification-webhook`;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchAppSettings();
      
      setWebsocketEnabled(settings.websocket_enabled === 'true');
      setWebhookUrl(settings.proactive_message_webhook_url || generateWebhookUrl());
      setToastWebhookUrl(settings.toast_notification_webhook_url || generateToastWebhookUrl());
    } catch (error) {
      console.error('Error loading WebSocket settings:', error);
      supaToast.error("There was an error loading the WebSocket settings.", {
        title: "Failed to load settings"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await updateAppSetting('websocket_enabled', websocketEnabled.toString());
      await updateAppSetting('proactive_message_webhook_url', webhookUrl);
      await updateAppSetting('toast_notification_webhook_url', toastWebhookUrl);
      
      supaToast.success("Real-time messaging settings have been updated successfully.", {
        title: "WebSocket settings saved"
      });
    } catch (error) {
      console.error('Error saving WebSocket settings:', error);
      supaToast.error("There was an error saving the WebSocket settings.", {
        title: "Failed to save settings"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = (url: string, type: 'chat' | 'toast') => {
    navigator.clipboard.writeText(url);
    supaToast.success(`${type === 'chat' ? 'Chat' : 'Toast notification'} webhook URL has been copied to your clipboard.`, {
      title: "Copied to clipboard"
    });
  };

  if (isLoading) {
    return <div>Loading WebSocket settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Real-time Messaging Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="websocket-enabled">Enable Real-time WebSocket Connections</Label>
              <p className="text-sm text-muted-foreground">
                Allow the application to receive and send messages in real-time via WebSocket connections
              </p>
            </div>
            <Switch
              id="websocket-enabled"
              checked={websocketEnabled}
              onCheckedChange={setWebsocketEnabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Chat Message Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Enter webhook URL for chat messages"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyWebhookUrl(webhookUrl, 'chat')}
                title="Copy webhook URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL to send proactive chat messages to users. 
              The webhook accepts POST requests with a JSON payload containing the message content.
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Example chat message payload:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "user_id": "uuid-here",
  "username": "john_doe",
  "message": "Hello from the system!",
  "sender": "Notification System",
  "metadata": {
    "priority": "normal"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toast-webhook-url">Toast Notification Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="toast-webhook-url"
                value={toastWebhookUrl}
                onChange={(e) => setToastWebhookUrl(e.target.value)}
                placeholder="Enter webhook URL for toast notifications"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyWebhookUrl(toastWebhookUrl, 'toast')}
                title="Copy toast webhook URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL to send app-wide toast notifications that appear as alerts. 
              These are separate from chat messages and appear as temporary notifications.
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Example toast notification payload:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "title": "System Alert",
  "message": "Maintenance scheduled for tonight",
  "type": "info",
  "user_id": "optional-specific-user",
  "target_users": ["optional", "array", "of", "user-ids"]
}`}
              </pre>
            </div>
          </div>
          
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save WebSocket Settings"}
          </Button>
        </CardContent>
      </Card>
      
      <WebhookTester />
    </div>
  );
}
