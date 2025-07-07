
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

export function AppSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tagline, setTagline] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState('');
  const [aiAgentName, setAiAgentName] = useState('');
  const [hideMenuTitle, setHideMenuTitle] = useState(false);

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
      setDefaultAvatarUrl(settings.default_avatar_url || '');
      setAiAgentName(settings.ai_agent_name || 'AI Assistant');
      setHideMenuTitle(settings.hide_menu_title === 'true');
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
      // Save tagline (previously app_name)
      await updateAppSetting('app_name', tagline);
      
      // Save site title
      await updateAppSetting('site_title', siteTitle);
      
      // Save default avatar URL
      await updateAppSetting('default_avatar_url', defaultAvatarUrl);
      
      // Save AI agent name
      await updateAppSetting('ai_agent_name', aiAgentName);
      
      // Save hide menu title setting
      await updateAppSetting('hide_menu_title', hideMenuTitle.toString());
      
      // Update cache with new values for immediate effect
      settingsCacheService.updateCache('app_name', tagline);
      settingsCacheService.updateCache('site_title', siteTitle);
      settingsCacheService.updateCache('default_avatar_url', defaultAvatarUrl);
      settingsCacheService.updateCache('ai_agent_name', aiAgentName);
      settingsCacheService.updateCache('hide_menu_title', hideMenuTitle.toString());
      
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

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hideMenuTitle"
                    checked={hideMenuTitle}
                    onChange={(e) => setHideMenuTitle(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="hideMenuTitle">Hide AI name and avatar in main menu</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, the AI name and avatar will be hidden from the dropdown menu.
                </p>
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
