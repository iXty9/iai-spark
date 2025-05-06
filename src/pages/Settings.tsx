
import React, { useState, useEffect } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeImportExport } from '@/components/settings/ThemeImportExport';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSettingsState } from '@/hooks/settings/use-settings-state';
import { useSettingsActions } from '@/hooks/settings/use-settings-actions';
import { ThemeColors } from '@/types/theme';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
  
  const handleImportTheme = (theme: any) => {
    toast({
      title: "Theme imported",
      description: "The new theme has been applied.",
      duration: 3000,
    });
    setHasChanges(true);
  };
  
  const handleSetDefault = () => {
    toast({
      title: "Default Theme Set",
      description: "This theme has been set as the system default.",
      duration: 3000,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Card className="w-full max-w-4xl p-8 bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-medium">Loading settings...</h2>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SettingsHeader />
      
      <main className="flex-1 container max-w-4xl mx-auto p-4 pt-0">
        <Card className="bg-card/80 backdrop-blur-sm border shadow-md">
          <SettingsTabs>
            <TabsContent value="appearance" className="space-y-6 mt-4 p-6">
              <h3 className="text-lg font-medium">Theme Appearance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize the colors and appearance of the application
              </p>
              
              <AppearanceSettings
                theme={theme as 'light' | 'dark'}
                lightTheme={lightTheme as ThemeColors}
                darkTheme={darkTheme as ThemeColors}
                onLightThemeChange={handleLightThemeChange}
                onDarkThemeChange={handleDarkThemeChange}
                onResetTheme={handleResetTheme}
              />
            </TabsContent>
            
            <TabsContent value="background" className="space-y-6 mt-4 p-6">
              <h3 className="text-lg font-medium mb-3">Background Image</h3>
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
            
            <TabsContent value="import-export" className="space-y-6 mt-4 p-6">
              <ThemeImportExport 
                theme={theme as any}
                onImport={handleImportTheme}
              />
            </TabsContent>
          </SettingsTabs>
          
          <SettingsFooter
            onSave={handleSave}
            onReset={handleReset}
            onCancel={handleCancel}
            onSetDefault={handleSetDefault}
            isSubmitting={isSubmitting}
            hasChanges={hasChanges}
          />
        </Card>
      </main>
    </div>
  );
};

export default Settings;
