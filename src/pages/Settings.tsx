
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
import { applyBackgroundImage } from '@/utils/theme-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  const { 
    lightTheme, 
    darkTheme, 
    backgroundImage, 
    backgroundOpacity,
    isSubmitting,
    isLoading,
    hasChanges,
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
    theme,
    toast,
    lightTheme,
    darkTheme,
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
    setTheme,
    updateProfile
  });

  // Apply background on the settings page too
  useEffect(() => {
    // Apply current background image if it exists
    if (backgroundImage) {
      logger.info('Applying background image to settings page', { module: 'settings' });
      applyBackgroundImage(backgroundImage, backgroundOpacity);
    } else {
      applyBackgroundImage(null, backgroundOpacity);
    }
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
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    navigate(-1);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card className="bg-background/80 backdrop-blur-sm">
        <SettingsHeader onGoBack={handleGoBack} />
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <AppearanceSettings
              theme={theme}
              lightTheme={lightTheme}
              darkTheme={darkTheme}
              backgroundImage={backgroundImage}
              backgroundOpacity={backgroundOpacity}
              onThemeChange={handleThemeChange}
              onLightThemeChange={(e) => handleThemeColorChange('light', e)}
              onDarkThemeChange={(e) => handleThemeColorChange('dark', e)}
              onBackgroundImageUpload={handleBackgroundImageUpload}
              onBackgroundOpacityChange={handleOpacityChange}
              onRemoveBackground={handleRemoveBackground}
              isBackgroundLoading={isBackgroundLoading}
            />
          )}
        </div>
        <SettingsFooter 
          onReset={handleResetSettings} 
          onCancel={handleGoBack} 
          onSave={handleSaveSettings}
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
        />
      </Card>
      
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
