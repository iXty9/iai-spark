
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function AppSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tagline, setTagline] = useState('');
  const [siteTitle, setSiteTitle] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchAppSettings();
      
      // Map settings to state
      setTagline(settings.app_name || 'The Everywhere Intelligent Assistant');
      setSiteTitle(settings.site_title || 'AI Chat Application');
    } catch (error) {
      console.error('Error loading app settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to load settings",
        description: "There was an error loading the application settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save tagline (previously app_name)
      await updateAppSetting('app_name', tagline);
      
      // Save site title
      await updateAppSetting('site_title', siteTitle);
      
      toast({
        title: "Settings saved",
        description: "Application settings have been updated successfully.",
      });
      
      // Apply site title immediately
      document.title = siteTitle;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: "There was an error saving the application settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Enter welcome screen tagline"
            />
            <p className="text-sm text-muted-foreground">
              This tagline appears on the welcome screen. The default is "The Everywhere Intelligent Assistant"
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siteTitle">Site Title</Label>
            <Input
              id="siteTitle"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="Enter site title"
            />
            <p className="text-sm text-muted-foreground">
              This title appears in the browser's title bar and tabs
            </p>
          </div>
          
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
