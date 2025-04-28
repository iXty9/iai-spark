
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';

export function WebhookSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    authenticated_webhook_url: '',
    anonymous_webhook_url: '',
    debug_webhook_url: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAppSetting('authenticated_webhook_url', settings.authenticated_webhook_url);
      await updateAppSetting('anonymous_webhook_url', settings.anonymous_webhook_url);
      await updateAppSetting('debug_webhook_url', settings.debug_webhook_url);
      
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

  if (isLoading) {
    return <div>Loading webhook settings...</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="authenticated_webhook_url">Authenticated Webhook URL</Label>
            <Input
              id="authenticated_webhook_url"
              name="authenticated_webhook_url"
              value={settings.authenticated_webhook_url}
              onChange={handleChange}
              placeholder="Enter authenticated webhook URL"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="anonymous_webhook_url">Anonymous Webhook URL</Label>
            <Input
              id="anonymous_webhook_url"
              name="anonymous_webhook_url"
              value={settings.anonymous_webhook_url}
              onChange={handleChange}
              placeholder="Enter anonymous webhook URL"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="debug_webhook_url">Debug Webhook URL</Label>
            <Input
              id="debug_webhook_url"
              name="debug_webhook_url"
              value={settings.debug_webhook_url}
              onChange={handleChange}
              placeholder="Enter debug webhook URL"
            />
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Webhook Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
