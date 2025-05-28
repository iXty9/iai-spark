
import { ThemeColors } from "@/types/theme";
import { themeService } from "@/services/theme-service";

/**
 * Applies theme color changes to the document root element
 * This is a wrapper around the theme service for backward compatibility
 */
export const applyThemeChanges = (themeColors: ThemeColors, mode?: 'light' | 'dark') => {
  const currentMode = mode || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  themeService.applyThemeImmediate(themeColors, currentMode);
  
  console.log('Applied theme colors via service:', themeColors);
};

/**
 * Applies background image and opacity to the document body
 * Fixed the opacity calculation bug
 */
export const applyBackgroundImage = (image: string | null, opacity: number) => {
  // Ensure opacity is between 0 and 1
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  
  themeService.applyBackground(image, clampedOpacity);
  
  console.log('Applied background:', { image: !!image, opacity: clampedOpacity });
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
  return themeService.createThemeSettings(
    theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity
  );
};

/**
 * Calculate a contrasting link color that works well with the background
 */
function calculateContrastingLinkColor(
  backgroundColor: string, 
  primaryColor: string, 
  textColor: string
): string {
  // Use primary color as the base
  let linkColor = primaryColor;
  
  // If the background is dark-ish, lighten the link color
  if (isColorDark(backgroundColor)) {
    return lightenColor(primaryColor, 0.2);
  } 
  // If background is light-ish, darken the link color
  else {
    return darkenColor(primaryColor, 0.2);
  }
}

/**
 * Determine if a color is dark (simplified)
 */
function isColorDark(color: string): boolean {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness < 128;
}

/**
 * Lighten a color by a percentage
 */
function lightenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const nr = Math.min(255, Math.floor(r + (255 - r) * amount));
  const ng = Math.min(255, Math.floor(g + (255 - g) * amount));
  const nb = Math.min(255, Math.floor(b + (255 - b) * amount));
  
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a color by a percentage
 */
function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const nr = Math.max(0, Math.floor(r * (1 - amount)));
  const ng = Math.max(0, Math.floor(g * (1 - amount)));
  const nb = Math.max(0, Math.floor(b * (1 - amount)));
  
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
