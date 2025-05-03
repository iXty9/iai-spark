
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { isValidUrl } from '@/utils/security';
import { z } from 'zod';
import { Info } from 'lucide-react';

// Schema for webhook URL validation
const webhookUrlSchema = z.string().refine(
  (url) => !url || isValidUrl(url, ['ixty.ai'], ['https:']),
  {
    message: 'URL must be a valid HTTPS URL from ixty.ai domain',
  }
);

export function WebhookSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    authenticated_webhook_url: '',
    anonymous_webhook_url: '',
    debug_webhook_url: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validateUrl = (name: string, value: string): string | null => {
    try {
      webhookUrlSchema.parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || 'Invalid URL';
      }
      return 'Invalid URL';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSave = async () => {
    // Validate all URLs
    const newErrors: Record<string, string> = {};
    
    Object.entries(settings).forEach(([key, value]) => {
      if (value) {
        const error = validateUrl(key, value);
        if (error) {
          newErrors[key] = error;
        }
      }
    });
    
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
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Webhook URLs must use HTTPS and be from the ixty.ai domain for security.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="authenticated_webhook_url">Authenticated Webhook URL</Label>
            <Input
              id="authenticated_webhook_url"
              name="authenticated_webhook_url"
              value={settings.authenticated_webhook_url}
              onChange={handleChange}
              placeholder="Enter authenticated webhook URL"
              className={errors.authenticated_webhook_url ? "border-destructive" : ""}
            />
            {errors.authenticated_webhook_url && (
              <AlertDescription className="text-destructive text-sm mt-1">
                {errors.authenticated_webhook_url}
              </AlertDescription>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="anonymous_webhook_url">Anonymous Webhook URL</Label>
            <Input
              id="anonymous_webhook_url"
              name="anonymous_webhook_url"
              value={settings.anonymous_webhook_url}
              onChange={handleChange}
              placeholder="Enter anonymous webhook URL"
              className={errors.anonymous_webhook_url ? "border-destructive" : ""}
            />
            {errors.anonymous_webhook_url && (
              <AlertDescription className="text-destructive text-sm mt-1">
                {errors.anonymous_webhook_url}
              </AlertDescription>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="debug_webhook_url">Debug Webhook URL</Label>
            <Input
              id="debug_webhook_url"
              name="debug_webhook_url"
              value={settings.debug_webhook_url}
              onChange={handleChange}
              placeholder="Enter debug webhook URL"
              className={errors.debug_webhook_url ? "border-destructive" : ""}
            />
            {errors.debug_webhook_url && (
              <AlertDescription className="text-destructive text-sm mt-1">
                {errors.debug_webhook_url}
              </AlertDescription>
            )}
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
