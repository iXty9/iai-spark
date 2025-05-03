
import { ThemeColors } from '@/types/theme';
import { useThemeColorActions } from './use-theme-color-actions';
import { useBackgroundActions } from './use-background-actions';
import { useSettingsPersistence } from './use-settings-persistence';

interface UseSettingsActionsProps {
  user: any;
  theme: 'light' | 'dark';
  toast: any;
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  isSubmitting: boolean;
  hasChanges: boolean;
  setLightTheme: (theme: ThemeColors) => void;
  setDarkTheme: (theme: ThemeColors) => void;
  setBackgroundImage: (image: string | null) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setHasChanges: (hasChanges: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateProfile?: (data: any) => Promise<any>;
}

export const useSettingsActions = ({
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
}: UseSettingsActionsProps) => {
  
  // Theme color actions
  const { 
    handleLightThemeChange, 
    handleDarkThemeChange 
  } = useThemeColorActions({
    theme,
    lightTheme,
    darkTheme,
    setLightTheme,
    setDarkTheme
  });

  // Background actions
  const { 
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    isLoading: isBackgroundLoading
  } = useBackgroundActions({
    backgroundImage,
    backgroundOpacity,
    setBackgroundImage,
    setBackgroundOpacity
  });
  
  // Settings persistence
  const {
    handleSaveSettings,
    handleResetSettings
  } = useSettingsPersistence({
    user,
    theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setHasChanges,
    updateProfile
  });
  
  // Handle theme change (light/dark toggle)
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setHasChanges(true);
  };

  return {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleResetSettings,
    handleThemeChange,
    isBackgroundLoading
  };
};
