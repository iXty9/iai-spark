
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useSimplifiedSettingsState } from '@/hooks/settings/use-simplified-settings-state';
import { useSimplifiedSettingsActions } from '@/hooks/settings/use-simplified-settings-actions';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { SettingsActions } from '@/components/settings/SettingsActions';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { AdminThemeActions } from '@/components/settings/AdminThemeActions';

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const {
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    isSubmitting,
    isLoading,
    hasChanges,
    imageInfo,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setHasChanges,
    setImageInfo,
    isInitialized
  } = useSimplifiedSettingsState();

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
  } = useSimplifiedSettingsActions({
    user,
    theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    setHasChanges,
    updateProfile
  });

  // Create wrapper functions to match AppearanceSettings prop types
  const handleLightThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleLightThemeChange({ name: colorKey, value });
  };

  const handleDarkThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleDarkThemeChange({ name: colorKey, value });
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingsHeader />
        
        <SettingsTabs>
          <div className="space-y-6">
            <AppearanceSettings
              theme={theme}
              lightTheme={lightTheme}
              darkTheme={darkTheme}
              onLightThemeChange={handleLightThemeChangeWrapper}
              onDarkThemeChange={handleDarkThemeChangeWrapper}
              onResetTheme={handleResetSettings}
            />
            
            <BackgroundSettings
              backgroundImage={backgroundImage}
              backgroundOpacity={backgroundOpacity}
              imageInfo={imageInfo}
              onBackgroundImageUpload={handleBackgroundImageUpload}
              onRemoveBackground={handleRemoveBackground}
              onOpacityChange={handleOpacityChange}
              isLoading={isBackgroundLoading}
            />
            
            <SettingsActions
              hasChanges={hasChanges}
              isSubmitting={isSubmitting}
              onSave={handleSaveSettings}
              onReset={handleResetSettings}
            />

            <AdminThemeActions />
          </div>
        </SettingsTabs>
        
        <SettingsFooter 
          onReset={handleResetSettings}
          onCancel={() => window.history.back()}
          onSave={handleSaveSettings}
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
        />
      </div>
    </div>
  );
}
