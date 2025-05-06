
import React from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeImportExport } from '@/components/settings/ThemeImportExport';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { useTheme } from '@/hooks/use-theme';
import { useThemeColorActions } from '@/hooks/settings/use-theme-color-actions';
import { useBackgroundActions } from '@/hooks/settings/use-background-actions';
import { useSettingsPersistence } from '@/hooks/settings/use-settings-persistence';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { 
    handleLightThemeChange, 
    handleDarkThemeChange,
    handleLightModeOpacityChange,
    handleDarkModeOpacityChange,
  } = useThemeColorActions();

  const { 
    handleBackgroundImageChange,
    handleBackgroundOpacityChange,
    handleRemoveBackground,
    handleBackgroundPositionChange,
    handleBackgroundBlurChange,
    isBackgroundLoading,
  } = useBackgroundActions();

  const {
    handleResetTheme,
    handleResetBackgroundOnly,
    handleSaveTheme,
    handleImportTheme,
    isSaving
  } = useSettingsPersistence();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SettingsHeader />
      
      <main className="flex-1 container max-w-4xl mx-auto p-4 pt-0">
        <SettingsTabs>
          <AppearanceSettings 
            theme={theme}
            onLightThemeChange={handleLightThemeChange}
            onDarkThemeChange={handleDarkThemeChange}
            onLightModeOpacityChange={handleLightModeOpacityChange}
            onDarkModeOpacityChange={handleDarkModeOpacityChange}
            onResetTheme={handleResetTheme}
          />
          
          <BackgroundSettings 
            theme={theme}
            onBackgroundImageChange={handleBackgroundImageChange}
            onBackgroundOpacityChange={handleBackgroundOpacityChange}
            onBackgroundPositionChange={handleBackgroundPositionChange}
            onBackgroundBlurChange={handleBackgroundBlurChange}
            onRemoveBackground={handleRemoveBackground}
            onResetBackgroundOnly={handleResetBackgroundOnly}
            isLoading={isBackgroundLoading}
          />
          
          <ThemeImportExport
            theme={theme}
            onImport={handleImportTheme}
          />
        </SettingsTabs>
      </main>

      <SettingsFooter 
        onSaveTheme={handleSaveTheme}
        isSaving={isSaving} 
      />
    </div>
  );
};

export default Settings;
