
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { ThemeColors } from '@/types/theme';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { useSettingsState } from '@/hooks/settings/use-settings-state';
import { useSettingsActions } from '@/hooks/settings/use-settings-actions';
import { logger } from '@/utils/logging';

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
    isSubmitting,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting,
    setTheme,
    updateProfile
  });

  // Apply background on the settings page too
  useEffect(() => {
    // Apply current background image if it exists
    if (backgroundImage) {
      logger.info('Applying background image to settings page', { module: 'settings' });
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.documentElement.style.setProperty('--bg-opacity', backgroundOpacity.toString());
      document.body.classList.add('with-bg-image');
    }

    return () => {
      // Don't clean up on unmount, as we want the background to persist
    };
  }, [backgroundImage, backgroundOpacity]);

  const handleThemeColorChange = (themeType: 'light' | 'dark', value: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => {
    if ('target' in value) {
      // Handle standard input change event
      if (themeType === 'light') {
        handleLightThemeChange(value);
      } else {
        handleDarkThemeChange(value);
      }
    } else {
      // Handle custom slider change event
      const { name, value: newValue } = value;
      const updatedTheme = themeType === 'light' ? 
        { ...lightTheme, [name]: newValue } : 
        { ...darkTheme, [name]: newValue };
      
      if (themeType === 'light') {
        setLightTheme(updatedTheme);
      } else {
        setDarkTheme(updatedTheme);
      }
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card className="bg-background/80 backdrop-blur-sm">
        <SettingsHeader onGoBack={handleGoBack} />
        <div className="p-6">
          <AppearanceSettings
            theme={theme}
            lightTheme={lightTheme}
            darkTheme={darkTheme}
            backgroundImage={backgroundImage}
            backgroundOpacity={backgroundOpacity}
            onThemeChange={value => setTheme(value)}
            onLightThemeChange={(e) => handleThemeColorChange('light', e)}
            onDarkThemeChange={(e) => handleThemeColorChange('dark', e)}
            onBackgroundImageUpload={handleBackgroundImageUpload}
            onBackgroundOpacityChange={value => setBackgroundOpacity(value[0])}
            onRemoveBackground={() => setBackgroundImage(null)}
          />
        </div>
        <SettingsFooter 
          onReset={handleResetSettings} 
          onCancel={handleGoBack} 
          onSave={handleSaveSettings}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
