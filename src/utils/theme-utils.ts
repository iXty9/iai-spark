
import { ThemeColors } from "@/types/theme";
import { unifiedThemeController } from "@/services/unified-theme-controller";

/**
 * Applies theme color changes via unified controller
 */
export const applyThemeChanges = (themeColors: ThemeColors, mode?: 'light' | 'dark') => {
  if (mode === 'light') {
    unifiedThemeController.setLightTheme(themeColors);
  } else if (mode === 'dark') {
    unifiedThemeController.setDarkTheme(themeColors);
  } else {
    // Apply to current mode
    const currentState = unifiedThemeController.getState();
    if (currentState.mode === 'light') {
      unifiedThemeController.setLightTheme(themeColors);
    } else {
      unifiedThemeController.setDarkTheme(themeColors);
    }
  }
  
  console.log('Applied theme colors via unified controller:', themeColors);
};

/**
 * Applies background image and opacity via unified controller
 */
export const applyBackgroundImage = (image: string | null, opacity: number) => {
  unifiedThemeController.setBackgroundImage(image);
  unifiedThemeController.setBackgroundOpacity(opacity);
  
  console.log('Applied background via unified controller:', { 
    image: !!image, 
    opacity: opacity
  });
};

/**
 * Creates a theme settings object from unified controller
 */
export const createThemeSettingsObject = (
  theme: 'light' | 'dark',
  lightTheme: ThemeColors,
  darkTheme: ThemeColors,
  backgroundImage: string | null,
  backgroundOpacity: number
) => {
  // Update controller state first
  unifiedThemeController.updateState({
    mode: theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity
  });
  
  // Return the settings object
  return unifiedThemeController.createThemeSettings();
};
