
import React, { useState } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSettingsState } from '@/hooks/settings/use-settings-state';
import { useSettingsActions } from '@/hooks/settings/use-settings-actions';
import { ThemeColors } from '@/types/theme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    isLoading,
    isSubmitting,
    hasChanges,
    imageInfo,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting,
    setHasChanges
  } = useSettingsState();

  const {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleResetSettings,
    handleThemeChange,
    isBackgroundLoading
  } = useSettingsActions({
    user,
    theme: theme as 'light' | 'dark',
    toast,
    lightTheme: lightTheme as ThemeColors,
    darkTheme: darkTheme as ThemeColors,
    backgroundImage,
    backgroundOpacity,
    isSubmitting,
    hasChanges,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting,
    setHasChanges,
    setTheme
  });
  
  // Helper functions to adapt colorKey/value to event format
  const adaptLightThemeChange = (colorKey: string, value: string) => {
    handleLightThemeChange({ name: colorKey, value });
  };
  
  const adaptDarkThemeChange = (colorKey: string, value: string) => {
    handleDarkThemeChange({ name: colorKey, value });
  };
  
  const handleResetTheme = () => {
    // Reset themes to defaults
    setLightTheme(null as any);
    setDarkTheme(null as any);
    toast({
      title: "Theme Reset",
      description: "Theme colors have been reset to defaults.",
      duration: 3000,
    });
    setHasChanges(true);
  };
  
  const handleSave = () => {
    handleSaveSettings();
  };
  
  const handleReset = () => {
    handleResetSettings();
  };
  
  const handleCancel = () => {
    navigate('/');
  };
  
  const handleSetDefault = () => {
    toast({
      title: "Default Theme Set",
      description: "This theme has been set as the system default.",
      duration: 3000,
    });
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-6xl mx-auto">
        <Card className="w-full max-w-4xl p-4 bg-card/90 backdrop-blur-md border shadow-lg">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-medium">Loading settings...</h2>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="container max-w-6xl mx-auto flex-1">
        <div className="mb-6 flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleGoBack}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-muted-foreground">Customize your app experience</p>
          </div>
        </div>
        
        <div className="grid gap-6">
          <Card className="bg-card/90 backdrop-blur-md border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTabs>
                <TabsContent value="appearance" className="space-y-6 mt-4">
                  <AppearanceSettings
                    theme={theme as 'light' | 'dark'}
                    lightTheme={lightTheme as ThemeColors}
                    darkTheme={darkTheme as ThemeColors}
                    onLightThemeChange={adaptLightThemeChange}
                    onDarkThemeChange={adaptDarkThemeChange}
                    onResetTheme={handleResetTheme}
                  />
                </TabsContent>
                
                <TabsContent value="background" className="space-y-6 mt-4">
                  <BackgroundSettings
                    backgroundImage={backgroundImage}
                    backgroundOpacity={backgroundOpacity}
                    onBackgroundImageUpload={handleBackgroundImageUpload}
                    onOpacityChange={handleOpacityChange}
                    onRemoveBackground={handleRemoveBackground}
                    isLoading={isBackgroundLoading}
                    imageInfo={imageInfo}
                  />
                </TabsContent>
              </SettingsTabs>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-4 mt-4">
            {hasChanges && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  Reset Changes
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
            {!hasChanges && (
              <Button 
                variant="outline" 
                onClick={handleSetDefault}
              >
                Set as Default
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
