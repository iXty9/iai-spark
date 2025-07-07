import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { setDefaultThemeSettings } from '@/services/admin/settingsService';
import { useTheme } from '@/contexts/SupaThemeContext';
import { supaToast } from '@/services/supa-toast';
import { useSoundSettings } from '@/hooks/use-sound-settings';
import { soundService } from '@/services/sound/sound-service';

export function ThemeSettings() {
  const { user } = useAuth();
  // Using unified SupaToast system
  const { currentTheme, mode, lightTheme, darkTheme, backgroundImage, backgroundOpacity } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [hasPersonalTheme, setHasPersonalTheme] = useState(false);
  const [isSettingSoundDefault, setIsSettingSoundDefault] = useState(false);
  const { settings: soundSettings } = useSoundSettings();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const adminStatus = await checkIsAdmin(user.id);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    const checkPersonalTheme = () => {
      // Check if user has personal theme settings
      setHasPersonalTheme(!!user); // Simple check for now
    };
    
    checkAdminStatus();
    checkPersonalTheme();
  }, [user]);

  const handleSetAsDefault = async () => {
    if (isSettingDefault) return;
    
    setIsSettingDefault(true);
    
    try {
      const currentThemeSettings = {
        mode,
        lightTheme,
        darkTheme,
        backgroundImage,
        backgroundOpacity,
        exportDate: new Date().toISOString(),
        name: 'Admin Default Theme'
      };
      
      const success = await setDefaultThemeSettings(currentThemeSettings);
      
      if (success) {
        supaToast.success("Your current theme settings have been set as the system default for all new users.", {
          title: "Default theme set"
        });
      } else {
        throw new Error('Failed to update default theme settings');
      }
    } catch (error) {
      supaToast.error("Failed to set default theme. Please try again.", {
        title: "Error"
      });
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleSetSoundAsDefault = async () => {
    if (isSettingSoundDefault || !soundSettings) return;
    
    setIsSettingSoundDefault(true);
    
    try {
      const defaultSoundSettings = {
        toast_notification_sound: soundSettings.toast_notification_sound,
        chat_message_sound: soundSettings.chat_message_sound,
        sounds_enabled: soundSettings.sounds_enabled,
        volume: soundSettings.volume
      };
      
      const success = await soundService.setDefaultSettings(defaultSoundSettings);
      
      if (success) {
        supaToast.success("Your current sound settings have been set as the system default for all new users.", {
          title: "Default sounds set"
        });
      } else {
        throw new Error('Failed to update default sound settings');
      }
    } catch (error) {
      supaToast.error("Failed to set default sounds. Please try again.", {
        title: "Error"
      });
    } finally {
      setIsSettingSoundDefault(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          System Theme Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            As an admin, you can set your current personal theme as the system-wide default. 
            This theme will be applied to all new users and users without personalized settings.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-foreground">Set Current Theme as Default</h4>
            <p className="text-sm text-muted-foreground">
              Apply your current theme settings as the system default for all users
            </p>
          </div>
          <Button
            onClick={handleSetAsDefault}
            disabled={isSettingDefault}
            className="flex items-center gap-2"
          >
            {isSettingDefault ? (
              <>
                <Save className="h-4 w-4 animate-pulse" />
                Setting...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Set as Default
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <strong>How it works:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Your current theme (colors, background, mode) becomes the system default</li>
            <li>New users will see this theme when they first visit</li>
            <li>Existing users with personal themes keep their settings</li>
            <li>Users without personal themes will see the new default</li>
          </ul>
        </div>

        {/* Sound Management Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            System Sound Management
          </h3>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-foreground">Set Current Sounds as Default</h4>
              <p className="text-sm text-muted-foreground">
                Apply your current sound settings as the system default for all users
              </p>
            </div>
            <Button
              onClick={handleSetSoundAsDefault}
              disabled={isSettingSoundDefault || !soundSettings}
              className="flex items-center gap-2"
            >
              {isSettingSoundDefault ? (
                <>
                  <Save className="h-4 w-4 animate-pulse" />
                  Setting...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  Set as Default
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg mt-4">
            <strong>Sound defaults include:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Custom notification and chat message sounds</li>
              <li>Volume levels and enabled/disabled state</li>
              <li>New users will inherit these sound preferences</li>
              <li>Existing users with custom sounds keep their settings</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}