
import { ThemeColors } from "@/types/theme";

/**
 * Applies theme color changes to the document root element
 */
export const applyThemeChanges = (themeColors: ThemeColors) => {
  const root = window.document.documentElement;
  
  // Apply all theme colors as CSS variables
  root.style.setProperty('--background-color', themeColors.backgroundColor);
  root.style.setProperty('--primary-color', themeColors.primaryColor);
  root.style.setProperty('--text-color', themeColors.textColor);
  root.style.setProperty('--accent-color', themeColors.accentColor);
  root.style.setProperty('--user-bubble-color', themeColors.userBubbleColor);
  root.style.setProperty('--ai-bubble-color', themeColors.aiBubbleColor);
  root.style.setProperty('--user-bubble-opacity', themeColors.userBubbleOpacity.toString());
  root.style.setProperty('--ai-bubble-opacity', themeColors.aiBubbleOpacity.toString());
  root.style.setProperty('--user-text-color', themeColors.userTextColor);
  root.style.setProperty('--ai-text-color', themeColors.aiTextColor);
  
  // Also update the body background color for immediate feedback
  document.body.style.backgroundColor = themeColors.backgroundColor;
};

/**
 * Applies background image and opacity to the document body
 */
export const applyBackgroundImage = (image: string | null, opacity: number) => {
  const root = document.documentElement;
  
  // Set the opacity CSS variable first
  root.style.setProperty('--bg-opacity', opacity.toString());
  
  if (image) {
    // Apply background image to body
    document.body.style.backgroundImage = `url(${image})`;
    document.body.classList.add('with-bg-image');
  } else {
    // Remove background image
    document.body.style.backgroundImage = 'none';
    document.body.classList.remove('with-bg-image');
  }
};

/**
 * Creates a theme settings object from current state
 */
export const createThemeSettingsObject = (
  theme: 'light' | 'dark',
  lightTheme: ThemeColors,
  darkTheme: ThemeColors,
  backgroundImage: string | null,
  backgroundOpacity: number
) => {
  return {
    mode: theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity: backgroundOpacity.toString()
  };
};
