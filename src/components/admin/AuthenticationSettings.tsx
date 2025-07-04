import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supaToast } from '@/services/supa-toast';
import { fetchAppSettings, updateAppSetting } from '@/services/admin/settingsService';
import { settingsCacheService } from '@/services/settings-cache-service';
import { Users, MessageSquare, Shield, Settings, Star, Rocket, Heart, Zap, Sparkles, Crown, Award, Trophy } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AuthSettings {
  auth_tagline: string;
  auth_tagline_icon: string;
  auth_welcome_description: string;
  auth_login_title: string;
  auth_login_description: string;
  auth_register_title: string;
  auth_register_description: string;
  auth_disclaimer_text: string;
  auth_disclaimer_required: string;
}

const ICON_OPTIONS = [
  { name: 'star', component: Star, label: 'Star' },
  { name: 'rocket', component: Rocket, label: 'Rocket' },
  { name: 'heart', component: Heart, label: 'Heart' },
  { name: 'zap', component: Zap, label: 'Lightning' },
  { name: 'sparkles', component: Sparkles, label: 'Sparkles' },
  { name: 'crown', component: Crown, label: 'Crown' },
  { name: 'award', component: Award, label: 'Award' },
  { name: 'trophy', component: Trophy, label: 'Trophy' },
];

export const AuthenticationSettings = () => {
  const [settings, setSettings] = useState<AuthSettings>({
    auth_tagline: '',
    auth_tagline_icon: 'star',
    auth_welcome_description: '',
    auth_login_title: '',
    auth_login_description: '',
    auth_register_title: '',
    auth_register_description: '',
    auth_disclaimer_text: '',
    auth_disclaimer_required: 'true',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const allSettings = await fetchAppSettings();
      setSettings({
        auth_tagline: allSettings.auth_tagline || 'Intelligent Conversations',
        auth_tagline_icon: allSettings.auth_tagline_icon || 'star',
        auth_welcome_description: allSettings.auth_welcome_description || 'Welcome back! Sign in to continue your intelligent conversations or create a new account to get started.',
        auth_login_title: allSettings.auth_login_title || 'Sign In',
        auth_login_description: allSettings.auth_login_description || 'Enter your credentials to access your account and continue your conversations.',
        auth_register_title: allSettings.auth_register_title || 'Create Account',
        auth_register_description: allSettings.auth_register_description || 'Join Ixty AI to start your intelligent conversation journey. Fill in your details below to get started.',
        auth_disclaimer_text: allSettings.auth_disclaimer_text || 'I agree to terms & conditions provided by the company. By providing my phone number, I agree to receive text messages from IXTY9 LLC.',
        auth_disclaimer_required: allSettings.auth_disclaimer_required || 'true',
      });
    } catch (error) {
      console.error('Error loading authentication settings:', error);
      supaToast.error('Failed to load authentication settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all settings
      await Promise.all([
        updateAppSetting('auth_tagline', settings.auth_tagline),
        updateAppSetting('auth_tagline_icon', settings.auth_tagline_icon),
        updateAppSetting('auth_welcome_description', settings.auth_welcome_description),
        updateAppSetting('auth_login_title', settings.auth_login_title),
        updateAppSetting('auth_login_description', settings.auth_login_description),
        updateAppSetting('auth_register_title', settings.auth_register_title),
        updateAppSetting('auth_register_description', settings.auth_register_description),
        updateAppSetting('auth_disclaimer_text', settings.auth_disclaimer_text),
        updateAppSetting('auth_disclaimer_required', settings.auth_disclaimer_required),
      ]);

      // Update cache for each setting
      Object.entries(settings).forEach(([key, value]) => {
        settingsCacheService.updateCache(key, value);
      });

      supaToast.success('Authentication settings saved successfully');
    } catch (error) {
      console.error('Error saving authentication settings:', error);
      supaToast.error('Failed to save authentication settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof AuthSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, auth_disclaimer_required: checked ? 'true' : 'false' }));
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base">General Text</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="auth_tagline" className="text-sm font-medium">Main Tagline</Label>
            <div className="flex gap-2">
              <Input
                id="auth_tagline"
                value={settings.auth_tagline}
                onChange={(e) => handleInputChange('auth_tagline', e.target.value)}
                placeholder="Intelligent Conversations"
                className="h-10 bg-background/50 border-border/50 flex-1"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                    {(() => {
                      const IconComponent = ICON_OPTIONS.find(icon => icon.name === settings.auth_tagline_icon)?.component || Star;
                      return <IconComponent className="h-4 w-4" />;
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {ICON_OPTIONS.map((icon) => (
                      <Button
                        key={icon.name}
                        variant={settings.auth_tagline_icon === icon.name ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleInputChange('auth_tagline_icon', icon.name)}
                        title={icon.label}
                      >
                        <icon.component className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label htmlFor="auth_welcome_description" className="text-sm font-medium">Welcome Description</Label>
            <Textarea
              id="auth_welcome_description"
              value={settings.auth_welcome_description}
              onChange={(e) => handleInputChange('auth_welcome_description', e.target.value)}
              placeholder="Welcome back! Sign in to continue..."
              className="min-h-[80px] bg-background/50 border-border/50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Login Settings */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            <CardTitle className="text-base">Login Form</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="auth_login_title" className="text-sm font-medium">Login Title</Label>
            <Input
              id="auth_login_title"
              value={settings.auth_login_title}
              onChange={(e) => handleInputChange('auth_login_title', e.target.value)}
              placeholder="Sign In"
              className="h-10 bg-background/50 border-border/50"
            />
          </div>
          <div>
            <Label htmlFor="auth_login_description" className="text-sm font-medium">Login Description</Label>
            <Textarea
              id="auth_login_description"
              value={settings.auth_login_description}
              onChange={(e) => handleInputChange('auth_login_description', e.target.value)}
              placeholder="Enter your credentials to access your account..."
              className="min-h-[60px] bg-background/50 border-border/50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Registration Settings */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base">Registration Form</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="auth_register_title" className="text-sm font-medium">Registration Title</Label>
            <Input
              id="auth_register_title"
              value={settings.auth_register_title}
              onChange={(e) => handleInputChange('auth_register_title', e.target.value)}
              placeholder="Create Account"
              className="h-10 bg-background/50 border-border/50"
            />
          </div>
          <div>
            <Label htmlFor="auth_register_description" className="text-sm font-medium">Registration Description</Label>
            <Textarea
              id="auth_register_description"
              value={settings.auth_register_description}
              onChange={(e) => handleInputChange('auth_register_description', e.target.value)}
              placeholder="Join Ixty AI to start your intelligent conversation journey..."
              className="min-h-[60px] bg-background/50 border-border/50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer Settings */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Terms & Conditions Disclaimer</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="auth_disclaimer_text" className="text-sm font-medium">Disclaimer Text</Label>
            <Textarea
              id="auth_disclaimer_text"
              value={settings.auth_disclaimer_text}
              onChange={(e) => handleInputChange('auth_disclaimer_text', e.target.value)}
              placeholder="I agree to terms & conditions provided by the company..."
              className="min-h-[80px] bg-background/50 border-border/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Require Disclaimer Acceptance</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, users must check the disclaimer box to register
              </p>
            </div>
            <Switch
              checked={settings.auth_disclaimer_required === 'true'}
              onCheckedChange={handleSwitchChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="min-w-[120px] h-10"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></div>
              Saving...
            </div>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};