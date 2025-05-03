
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { supabase } from '@/integrations/supabase/client';
import { SettingsFooter } from '@/components/settings/SettingsFooter';

export function AppSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    tagline: '',
    avatar_url: '',
    site_title: ''
  });
  const [originalSettings, setOriginalSettings] = useState({
    tagline: '',
    avatar_url: '',
    site_title: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await fetchAppSettings();
        const newSettings = {
          tagline: appSettings['app_name'] || '',
          avatar_url: appSettings['avatar_url'] || '',
          site_title: appSettings['site_title'] || 'Ixty AI - The Everywhere Intelligent Assistant'
        };
        
        setSettings(newSettings);
        setOriginalSettings(newSettings);
      } catch (error) {
        console.error('Error loading app settings:', error);
        toast({
          variant: "destructive",
          title: "Failed to load app settings",
          description: "There was an error loading the app settings.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  useEffect(() => {
    // Check if any settings have changed
    const hasChanged = 
      settings.tagline !== originalSettings.tagline || 
      settings.avatar_url !== originalSettings.avatar_url ||
      settings.site_title !== originalSettings.site_title;
    
    setHasChanges(hasChanged);
  }, [settings, originalSettings]);

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
      // Save app_name (tagline)
      await updateAppSetting('app_name', settings.tagline);
      
      // Save avatar_url
      await updateAppSetting('avatar_url', settings.avatar_url);
      
      // Save site_title
      await updateAppSetting('site_title', settings.site_title);
      
      // Update document title if we're in the browser
      if (typeof document !== 'undefined' && settings.site_title) {
        document.title = settings.site_title;
      }
      
      // Update original settings to match current settings
      setOriginalSettings({...settings});
      setHasChanges(false);
      
      toast({
        title: "App settings saved",
        description: "Your app settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving app settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save app settings",
        description: "There was an error saving the app settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({...originalSettings});
    setHasChanges(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `app-avatar/${Math.random()}.${fileExt}`;
      
      setIsUploading(true);
      
      // Create storage bucket if it doesn't exist
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (!buckets?.some(bucket => bucket.name === 'app-assets')) {
        await supabase.storage.createBucket('app-assets', { public: true });
      }
      
      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      
      // Update the avatar URL in state
      setSettings(prev => ({
        ...prev,
        avatar_url: data.publicUrl
      }));
      
      toast({
        title: "Avatar uploaded",
        description: "The AI assistant avatar has been uploaded. Click Save to update.",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading the avatar",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div>Loading app settings...</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site_title">Site Title</Label>
            <Input
              id="site_title"
              name="site_title"
              value={settings.site_title}
              onChange={handleChange}
              placeholder="Enter site title"
            />
            <p className="text-sm text-muted-foreground">This will be shown in the browser's title bar.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              name="tagline"
              value={settings.tagline}
              onChange={handleChange}
              placeholder="Enter tagline text"
            />
            <p className="text-sm text-muted-foreground">This will be shown as the welcome tagline on the home screen.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avatar_url">AI Assistant Avatar URL</Label>
            <div className="flex space-x-2">
              <Input
                id="avatar_url"
                name="avatar_url"
                value={settings.avatar_url}
                onChange={handleChange}
                placeholder="Enter avatar URL or upload an image"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                asChild
                disabled={isUploading}
              >
                <label className="cursor-pointer">
                  {isUploading ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">This will be used as the AI assistant's profile picture.</p>
          </div>
          
          {settings.avatar_url && (
            <div className="flex justify-center">
              <img 
                src={settings.avatar_url} 
                alt="AI Avatar Preview" 
                className="w-16 h-16 rounded-full object-cover border"
              />
            </div>
          )}
        </div>
      </CardContent>
      <SettingsFooter
        onReset={handleReset}
        onCancel={() => {}}
        onSave={handleSave}
        isSubmitting={isSaving}
        hasChanges={hasChanges}
      />
    </Card>
  );
}
