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

const webhookUrlSchema = z.string().refine(
  url => !url || isValidUrl(url, ['ixty.ai'], ['https:']),
  { message: 'URL must be a valid HTTPS URL from ixty.ai domain' }
);

const fields = [
  { key: 'authenticated_webhook_url', label: 'Authenticated Webhook URL', placeholder: 'Enter authenticated webhook URL' },
  { key: 'anonymous_webhook_url', label: 'Anonymous Webhook URL', placeholder: 'Enter anonymous webhook URL' },
  { key: 'debug_webhook_url', label: 'Debug Webhook URL', placeholder: 'Enter debug webhook URL' }
];

export function WebhookSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAppSettings()
      .then(appSettings => setSettings(fields.reduce((acc, f) => ({ ...acc, [f.key]: appSettings[f.key] || '' }), {})))
      .catch(error => {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Failed to load webhook settings",
          description: "There was an error loading the webhook settings."
        });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const validateUrl = (value: string) => {
    try { webhookUrlSchema.parse(value); return null; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message || 'Invalid URL' : 'Invalid URL'; }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(s => ({ ...s, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    fields.forEach(f => {
      if (settings[f.key]) {
        const error = validateUrl(settings[f.key]);
        if (error) newErrors[f.key] = error;
      }
    });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Please fix the errors before saving."
      });
      return;
    }
    setIsSaving(true);
    try {
      await Promise.all(fields.map(f => updateAppSetting(f.key, settings[f.key])));
      toast({ title: "Webhook settings saved", description: "Your webhook settings have been updated successfully." });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to save webhook settings",
        description: "There was an error saving the webhook settings."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading webhook settings...</div>;

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
          {fields.map(({ key, label, placeholder }) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                name={key}
                value={settings[key] || ''}
                onChange={handleChange}
                placeholder={placeholder}
                className={errors[key] ? 'border-destructive' : ''}
              />
              {errors[key] && (
                <AlertDescription className="text-destructive text-sm mt-1">
                  {errors[key]}
                </AlertDescription>
              )}
            </div>
          ))}
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Webhook Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}