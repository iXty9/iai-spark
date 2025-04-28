
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeColors } from '@/types/theme';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { useSettingsState } from '@/hooks/settings/use-settings-state';
import { useSettingsActions } from '@/hooks/settings/use-settings-actions';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  
  const { 
    lightTheme, 
    darkTheme, 
    backgroundImage, 
    backgroundOpacity,
    isSubmitting,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting
  } = useSettingsState();
  
  const {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleSaveSettings,
    handleResetSettings
  } = useSettingsActions({
    user,
    theme,
    toast,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    isSubmitting,
    setIsSubmitting,
    setTheme,
    updateProfile
  });

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <SettingsHeader onGoBack={handleGoBack} />
        <SettingsTabs 
          appearanceContent={
            <AppearanceSettings
              theme={theme}
              lightTheme={lightTheme}
              darkTheme={darkTheme}
              onThemeChange={value => setTheme(value)}
              onLightThemeChange={handleLightThemeChange}
              onDarkThemeChange={handleDarkThemeChange}
            />
          }
          backgroundContent={
            <BackgroundSettings
              backgroundImage={backgroundImage}
              backgroundOpacity={backgroundOpacity}
              onBackgroundImageUpload={handleBackgroundImageUpload}
              onOpacityChange={value => setBackgroundOpacity(value[0])}
              onRemoveBackground={() => setBackgroundImage(null)}
            />
          }
        />
        <SettingsFooter 
          onReset={handleResetSettings} 
          onCancel={handleGoBack} 
          onSave={handleSaveSettings}
        />
      </Card>
    </div>
  );
}
