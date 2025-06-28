
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink } from 'lucide-react';

export function WebSocketSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [websocketEnabled, setWebsocketEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Generate the webhook URL based on current environment
  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321'
      : 'https://ymtdtzkskjdqlzhjuesk.supabase.co';
    return `${baseUrl}/functions/v1/proactive-message-webhook`;
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
    } catch (error) {
      console.error('Error loading WebSocket settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to load settings",
        description: "There was an error loading the WebSocket settings.",
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
      
      toast({
        title: "WebSocket settings saved",
        description: "Real-time messaging settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving WebSocket settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: "There was an error saving the WebSocket settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied to your clipboard.",
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
            <Label htmlFor="webhook-url">Incoming Message Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Enter webhook URL for incoming messages"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
                title="Copy webhook URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL in your n8n workflows or external systems to send proactive messages to users. 
              The webhook accepts POST requests with a JSON payload containing the message content.
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Example payload:</p>
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
          
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save WebSocket Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
