
import { useState, useEffect } from 'react';
import { supaToast } from '@/services/supa-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { settingsCacheService } from '@/services/settings-cache-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WebSocketSettings } from './WebSocketSettings';
import { Switch } from '@/components/ui/switch';

export function AppSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tagline, setTagline] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState('');
  const [aiAgentName, setAiAgentName] = useState('');
  const [showAiInMenu, setShowAiInMenu] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchAppSettings();
      
      // Map settings to state - support both old (app_name) and new (tagline) keys
      setTagline(settings.tagline || settings.app_name || 'The Everywhere Intelligent Assistant');
      setSiteTitle(settings.site_title || 'AI Chat Application');
      setDefaultAvatarUrl(settings.default_avatar_url || '');
      setAiAgentName(settings.ai_agent_name || 'AI Assistant');
      setShowAiInMenu(settings.show_ai_in_menu !== 'false');
    } catch (error) {
      console.error('Error loading app settings:', error);
      supaToast.error("There was an error loading the application settings.", {
        title: "Failed to load settings"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      // Save tagline
      await updateAppSetting('tagline', tagline);
      
      // Save site title
      await updateAppSetting('site_title', siteTitle);
      
      // Save default avatar URL
      await updateAppSetting('default_avatar_url', defaultAvatarUrl);
      
      // Save AI agent name
      await updateAppSetting('ai_agent_name', aiAgentName);
      
      // Save show AI in menu toggle
      await updateAppSetting('show_ai_in_menu', showAiInMenu ? 'true' : 'false');
      
      // Import cache invalidation dynamically to avoid circular dependencies
      const { cacheInvalidationService } = await import('@/services/pwa/cache-invalidation-service');
      
      // Force cache invalidation in both localStorage and Service Worker
      await settingsCacheService.invalidateCache();
      await cacheInvalidationService.invalidateAppSettings();
      
      supaToast.success("Application settings have been updated successfully.", {
        title: "Settings saved"
      });
      
      // Apply site title immediately
      document.title = siteTitle;
    } catch (error) {
      console.error('Error saving settings:', error);
      supaToast.error("There was an error saving the application settings.", {
        title: "Failed to save settings"
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
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="websocket">Real-time Messaging</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>General Application Settings</CardTitle>
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
                  This tagline appears on the welcome screen. The default is &quot;The Everywhere Intelligent Assistant&quot;
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

              <div className="space-y-2">
                <Label htmlFor="aiAgentName">AI Agent Name</Label>
                <Input
                  id="aiAgentName"
                  value={aiAgentName}
                  onChange={(e) => setAiAgentName(e.target.value)}
                  placeholder="Enter AI agent name"
                />
                <p className="text-sm text-muted-foreground">
                  This name appears in the chat interface as the AI assistant's display name
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultAvatarUrl">Default Avatar URL</Label>
                <Input
                  id="defaultAvatarUrl"
                  value={defaultAvatarUrl}
                  onChange={(e) => setDefaultAvatarUrl(e.target.value)}
                  placeholder="Enter default avatar URL (HTTPS required)"
                  type="url"
                />
                <p className="text-sm text-muted-foreground">
                  This avatar is used as the default for AI messages and user fallbacks. Leave empty to use built-in fallback.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <div className="space-y-1">
                  <Label htmlFor="showAiInMenu">Show AI identity in main menu</Label>
                  <p className="text-xs text-muted-foreground">Toggle to show or hide the AI avatar and name in the dropdown menu header.</p>
                </div>
                <Switch id="showAiInMenu" checked={showAiInMenu} onCheckedChange={setShowAiInMenu} disabled={isSaving} />
              </div>
              
              <Button 
                onClick={saveGeneralSettings} 
                disabled={isSaving}
                className="mt-4"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="websocket" className="space-y-6">
          <WebSocketSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
