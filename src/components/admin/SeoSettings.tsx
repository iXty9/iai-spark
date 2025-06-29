
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { settingsCacheService } from '@/services/settings-cache-service';
import { Globe, Image, Twitter, Facebook, Save, RefreshCw } from 'lucide-react';

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
  const [settings, setSettings] = useState<SeoSettingsData>({
    seo_site_title: '',
    seo_site_description: '',
    seo_site_author: '',
    seo_og_image_url: '',
    seo_twitter_handle: '',
    seo_favicon_url: '',
    seo_og_type: 'website'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load SEO settings. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key: keyof SeoSettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Allow empty URLs
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!settings.seo_site_title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Site title is required."
      });
      return;
    }

    if (!settings.seo_site_description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error", 
        description: "Site description is required."
      });
      return;
    }

    if (settings.seo_site_description.length > 160) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Site description should be under 160 characters for optimal SEO."
      });
      return;
    }

    if (!validateUrl(settings.seo_og_image_url)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Open Graph image URL is not valid."
      });
      return;
    }

    if (!validateUrl(settings.seo_favicon_url)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Favicon URL is not valid."
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Save all settings
      const savePromises = Object.entries(settings).map(([key, value]) =>
        updateAppSetting(key, value)
      );

      await Promise.all(savePromises);

      // Update cache for each setting
      Object.entries(settings).forEach(([key, value]) => {
        settingsCacheService.updateCache(key, value);
      });

      toast({
        title: "Success",
        description: "SEO settings saved successfully. Changes will take effect on page refresh."
      });

    } catch (error) {
      console.error('Failed to save SEO settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save SEO settings. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">SEO Settings</h2>
        <p className="text-muted-foreground">
          Configure how your site appears in search engines and social media
        </p>
      </div>

      <div className="grid gap-6">
        {/* Basic SEO Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Basic SEO
            </CardTitle>
            <CardDescription>
              Essential settings for search engine optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-title">Site Title*</Label>
              <Input
                id="site-title"
                value={settings.seo_site_title}
                onChange={(e) => handleInputChange('seo_site_title', e.target.value)}
                placeholder="Enter your site title"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: Under 60 characters ({settings.seo_site_title.length}/60)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-description">Site Description*</Label>
              <Textarea
                id="site-description"
                value={settings.seo_site_description}
                onChange={(e) => handleInputChange('seo_site_description', e.target.value)}
                placeholder="Describe your site in a few sentences"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: Under 160 characters ({settings.seo_site_description.length}/160)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-author">Site Author</Label>
              <Input
                id="site-author"
                value={settings.seo_site_author}
                onChange={(e) => handleInputChange('seo_site_author', e.target.value)}
                placeholder="Enter the author or company name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Social Media Preview
            </CardTitle>
            <CardDescription>
              Control how your site appears when shared on social platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="og-image">Open Graph Image URL</Label>
              <Input
                id="og-image"
                type="url"
                value={settings.seo_og_image_url}
                onChange={(e) => handleInputChange('seo_og_image_url', e.target.value)}
                placeholder="https://yoursite.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1200x630px image for optimal social sharing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter-handle">Twitter Handle</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                  @
                </span>
                <Input
                  id="twitter-handle"
                  value={settings.seo_twitter_handle}
                  onChange={(e) => handleInputChange('seo_twitter_handle', e.target.value.replace('@', ''))}
                  placeholder="yourhandle"
                  className="rounded-l-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Configure your site's visual identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon URL</Label>
              <Input
                id="favicon"
                type="url"
                value={settings.seo_favicon_url}
                onChange={(e) => handleInputChange('seo_favicon_url', e.target.value)}
                placeholder="https://yoursite.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 32x32px or 16x16px .ico, .png, or .svg file
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Preview</CardTitle>
            <CardDescription>
              Preview how your site will appear when shared
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex gap-3">
                {settings.seo_og_image_url && (
                  <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                    <img 
                      src={settings.seo_og_image_url} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {settings.seo_site_title || 'Site Title'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {settings.seo_site_description || 'Site description will appear here...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    yoursite.com
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save SEO Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
