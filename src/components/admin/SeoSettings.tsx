
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supaToast } from '@/services/supa-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { settingsCacheService } from '@/services/settings-cache-service';
import { Loader2, Save } from 'lucide-react';

interface SeoSettingsData {
  seo_site_title: string;
  seo_site_description: string;
  seo_site_author: string;
  seo_og_image_url: string;
  seo_twitter_handle: string;
  seo_favicon_url: string;
  seo_og_type: string;
}

export function SeoSettings() {
  // Using unified SupaToast system
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SeoSettingsData>({
    seo_site_title: '',
    seo_site_description: '',
    seo_site_author: '',
    seo_og_image_url: '',
    seo_twitter_handle: '',
    seo_favicon_url: '',
    seo_og_type: 'website'
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await fetchAppSettings();
        setSettings({
          seo_site_title: appSettings.seo_site_title || '',
          seo_site_description: appSettings.seo_site_description || '',
          seo_site_author: appSettings.seo_site_author || '',
          seo_og_image_url: appSettings.seo_og_image_url || '',
          seo_twitter_handle: appSettings.seo_twitter_handle || '',
          seo_favicon_url: appSettings.seo_favicon_url || '',
          seo_og_type: appSettings.seo_og_type || 'website'
        });
      } catch (error) {
        console.error('Failed to load SEO settings:', error);
        supaToast.error("Failed to load SEO settings.", {
          title: "Error"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleInputChange = (key: keyof SeoSettingsData, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all settings
      const savePromises = Object.entries(settings).map(([key, value]) =>
        updateAppSetting(key, value)
      );

      await Promise.all(savePromises);

      // Update cache for each setting
      Object.entries(settings).forEach(([key, value]) => {
        settingsCacheService.updateCache(key, value);
      });

      supaToast.success("SEO settings saved successfully.", {
        title: "Success"
      });
    } catch (error) {
      console.error('Failed to save SEO settings:', error);
      supaToast.error("Failed to save SEO settings.", {
        title: "Error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seo_site_title">Site Title</Label>
              <Input
                id="seo_site_title"
                value={settings.seo_site_title}
                onChange={(e) => handleInputChange('seo_site_title', e.target.value)}
                placeholder="Enter site title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seo_site_author">Site Author</Label>
              <Input
                id="seo_site_author"
                value={settings.seo_site_author}
                onChange={(e) => handleInputChange('seo_site_author', e.target.value)}
                placeholder="Enter site author"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo_site_description">Site Description</Label>
            <Textarea
              id="seo_site_description"
              value={settings.seo_site_description}
              onChange={(e) => handleInputChange('seo_site_description', e.target.value)}
              placeholder="Enter site description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seo_og_image_url">Open Graph Image URL</Label>
              <Input
                id="seo_og_image_url"
                value={settings.seo_og_image_url}
                onChange={(e) => handleInputChange('seo_og_image_url', e.target.value)}
                placeholder="Enter Open Graph image URL"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seo_favicon_url">Favicon URL</Label>
              <Input
                id="seo_favicon_url"
                value={settings.seo_favicon_url}
                onChange={(e) => handleInputChange('seo_favicon_url', e.target.value)}
                placeholder="Enter favicon URL"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seo_twitter_handle">Twitter Handle</Label>
              <Input
                id="seo_twitter_handle"
                value={settings.seo_twitter_handle}
                onChange={(e) => handleInputChange('seo_twitter_handle', e.target.value)}
                placeholder="@your_handle"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seo_og_type">Open Graph Type</Label>
              <Input
                id="seo_og_type"
                value={settings.seo_og_type}
                onChange={(e) => handleInputChange('seo_og_type', e.target.value)}
                placeholder="website, article, etc."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save SEO Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
