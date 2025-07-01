import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { setDefaultThemeSettings } from '@/services/admin/settingsService';
import { useTheme } from '@/contexts/SupaThemeContext';
import { useToast } from '@/hooks/use-toast';

export function ThemeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, mode, lightTheme, darkTheme, backgroundImage, backgroundOpacity } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [hasPersonalTheme, setHasPersonalTheme] = useState(false);

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
        toast({
          title: "Default theme set",
          description: "Your current theme settings have been set as the system default for all new users.",
        });
      } else {
        throw new Error('Failed to update default theme settings');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default theme. Please try again.",
      });
    } finally {
      setIsSettingDefault(false);
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
      </CardContent>
    </Card>
  );
}