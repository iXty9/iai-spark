
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';
import { Smartphone, Palette, Settings, Eye, RefreshCw, Zap } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { PWAVersionIndicator } from '@/components/pwa/PWAVersionIndicator';

interface PWASettingsState {
  pwa_app_name: string;
  pwa_short_name: string;
  pwa_description: string;
  pwa_theme_color: string;
  pwa_background_color: string;
  pwa_display_mode: string;
  pwa_orientation: string;
  pwa_start_url: string;
  pwa_scope: string;
  pwa_categories: string;
  pwa_lang: string;
  pwa_icon_url: string;
}

export function PWASettings() {
  const { toast } = useToast();
  const { isInstalled, currentVersion, needsUpdate } = usePWA();
  const [settings, setSettings] = useState<PWASettingsState>({
    pwa_app_name: '',
    pwa_short_name: '',
    pwa_description: '',
    pwa_theme_color: '#dd3333',
    pwa_background_color: '#ffffff',
    pwa_display_mode: 'standalone',
    pwa_orientation: 'portrait-primary',
    pwa_start_url: '/',
    pwa_scope: '/',
    pwa_categories: '["productivity", "business", "utilities"]',
    pwa_lang: 'en',
    pwa_icon_url: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const fetchedSettings = await fetchAppSettings();
      
      const pwaSettings: Partial<PWASettingsState> = {};
      Object.keys(settings).forEach(key => {
        if (fetchedSettings[key]) {
          pwaSettings[key as keyof PWASettingsState] = fetchedSettings[key];
        }
      });
      
      setSettings(prev => ({ ...prev, ...pwaSettings }));
      logger.info('PWA settings loaded successfully', null, { module: 'pwa-settings' });
    } catch (error) {
      logger.error('Failed to load PWA settings', error, { module: 'pwa-settings' });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load PWA settings"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Save all PWA settings
      for (const [key, value] of Object.entries(settings)) {
        await updateAppSetting(key, value);
      }
      
      toast({
        title: "Success",
        description: "PWA settings saved successfully. Changes will be available after the next update."
      });
      
      logger.info('PWA settings saved successfully', null, { module: 'pwa-settings' });
    } catch (error) {
      logger.error('Failed to save PWA settings', error, { module: 'pwa-settings' });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save PWA settings"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof PWASettingsState, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const generateManifestPreview = () => {
    try {
      const categories = JSON.parse(settings.pwa_categories || '[]');
      return {
        name: settings.pwa_app_name,
        short_name: settings.pwa_short_name,
        description: settings.pwa_description,
        start_url: settings.pwa_start_url,
        display: settings.pwa_display_mode,
        background_color: settings.pwa_background_color,
        theme_color: settings.pwa_theme_color,
        orientation: settings.pwa_orientation,
        scope: settings.pwa_scope,
        categories: categories,
        lang: settings.pwa_lang
      };
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PWA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Current Progressive Web App installation and version status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={isInstalled ? "default" : "secondary"}>
                {isInstalled ? "Installed" : "Browser Mode"}
              </Badge>
              <PWAVersionIndicator />
              {needsUpdate && (
                <Badge variant="destructive" className="animate-pulse">
                  Update Available
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {isInstalled 
              ? "App is installed and running in PWA mode with automatic updates enabled."
              : "App is running in browser mode. Install as PWA for better performance and offline access."
            }
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Information
          </CardTitle>
          <CardDescription>
            Configure how your app appears when installed as a PWA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="app_name">App Name</Label>
              <Input
                id="app_name"
                value={settings.pwa_app_name}
                onChange={(e) => handleInputChange('pwa_app_name', e.target.value)}
                placeholder="Full app name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_name">Short Name</Label>
              <Input
                id="short_name"
                value={settings.pwa_short_name}
                onChange={(e) => handleInputChange('pwa_short_name', e.target.value)}
                placeholder="Short name for icon"
                maxLength={12}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.pwa_description}
              onChange={(e) => handleInputChange('pwa_description', e.target.value)}
              placeholder="App description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Customize colors and visual appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme_color">Theme Color</Label>
              <div className="flex gap-2">
                <Input
                  id="theme_color"
                  type="color"
                  value={settings.pwa_theme_color}
                  onChange={(e) => handleInputChange('pwa_theme_color', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.pwa_theme_color}
                  onChange={(e) => handleInputChange('pwa_theme_color', e.target.value)}
                  placeholder="#dd3333"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="background_color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="background_color"
                  type="color"
                  value={settings.pwa_background_color}
                  onChange={(e) => handleInputChange('pwa_background_color', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.pwa_background_color}
                  onChange={(e) => handleInputChange('pwa_background_color', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon_url">App Icon URL</Label>
            <Input
              id="icon_url"
              value={settings.pwa_icon_url}
              onChange={(e) => handleInputChange('pwa_icon_url', e.target.value)}
              placeholder="https://example.com/icon.png (leave empty to use default)"
            />
            <p className="text-sm text-muted-foreground">
              Recommended: 512x512 PNG image. Leave empty to use current app icon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Behavior
          </CardTitle>
          <CardDescription>
            Configure how the app behaves when installed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_mode">Display Mode</Label>
              <Select value={settings.pwa_display_mode} onValueChange={(value) => handleInputChange('pwa_display_mode', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone (App-like)</SelectItem>
                  <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                  <SelectItem value="browser">Browser</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select value={settings.pwa_orientation} onValueChange={(value) => handleInputChange('pwa_orientation', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait-primary">Portrait</SelectItem>
                  <SelectItem value="landscape-primary">Landscape</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_url">Start URL</Label>
              <Input
                id="start_url"
                value={settings.pwa_start_url}
                onChange={(e) => handleInputChange('pwa_start_url', e.target.value)}
                placeholder="/"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Input
                id="scope"
                value={settings.pwa_scope}
                onChange={(e) => handleInputChange('pwa_scope', e.target.value)}
                placeholder="/"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manifest Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Manifest Preview
          </CardTitle>
          <CardDescription>
            Preview of the generated PWA manifest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-64">
{JSON.stringify(generateManifestPreview(), null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save PWA Settings'}
        </Button>
        <Button variant="outline" onClick={loadSettings} disabled={isLoading}>
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>💡 Changes will be available after the next app update.</p>
        <p>🔄 PWA users receive automatic update notifications.</p>
        <p>📱 Users may need to reinstall the app to see manifest changes.</p>
      </div>
    </div>
  );
}
