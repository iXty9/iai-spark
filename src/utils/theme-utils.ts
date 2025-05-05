import { ThemeColors } from "@/types/theme";
import { logger } from "@/utils/logging";

/**
 * Applies theme color changes to the document root element
 */
export const applyThemeChanges = (themeColors: ThemeColors) => {
  try {
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
    
    // Calculate link color based on theme - links should contrast with background
    // Use a shade of the primary color or accent color for better visibility
    const linkColor = calculateContrastingLinkColor(
      themeColors.backgroundColor, 
      themeColors.primaryColor, 
      themeColors.aiTextColor
    );
    root.style.setProperty('--link-color', linkColor);
    
    logger.info('Applied theme colors successfully', { 
      module: 'theme-utils',
      bg: themeColors.backgroundColor
    });
    
    return true;
  } catch (err) {
    logger.error('Error applying theme colors:', err, { module: 'theme-utils' });
    return false;
  }
};

/**
 * Calculate a contrasting link color that works well with the background
 */
function calculateContrastingLinkColor(
  backgroundColor: string, 
  primaryColor: string, 
  textColor: string
): string {
  // Create a vibrant link color that contrasts with both background and text
  // This is a simplified version - for real sites, consider using a color contrast library
  
  // Use primary color as the base
  let linkColor = primaryColor;
  
  // If the background is dark-ish, lighten the link color
  if (isColorDark(backgroundColor)) {
    return lightenColor(primaryColor, 0.2); // Brighten by 20%
  } 
  // If background is light-ish, darken the link color
  else {
    return darkenColor(primaryColor, 0.2); // Darken by 20%
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
  
  // Calculate brightness (simple method)
  // Formula: (R * 299 + G * 587 + B * 114) / 1000
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if the color is dark
  return brightness < 128;
}

/**
 * Lighten a color by a percentage
 */
function lightenColor(color: string, amount: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Lighten by amount (0-1)
  const nr = Math.min(255, Math.floor(r + (255 - r) * amount));
  const ng = Math.min(255, Math.floor(g + (255 - g) * amount));
  const nb = Math.min(255, Math.floor(b + (255 - b) * amount));
  
  // Convert back to hex
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a color by a percentage
 */
function darkenColor(color: string, amount: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Darken by amount (0-1)
  const nr = Math.max(0, Math.floor(r * (1 - amount)));
  const ng = Math.max(0, Math.floor(g * (1 - amount)));
  const nb = Math.max(0, Math.floor(b * (1 - amount)));
  
  // Convert back to hex
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Applies background image and opacity to the document body
 */
export const applyBackgroundImage = (image: string | null, opacity: number) => {
  try {
    const root = document.documentElement;
    
    // Set the opacity CSS variable first
    root.style.setProperty('--bg-opacity', opacity.toString());
    
    if (image) {
      // Apply background image to body
      document.body.style.backgroundImage = `url(${image})`;
      document.body.classList.add('with-bg-image');
      logger.info('Applied background image successfully', { module: 'theme-utils' });
    } else {
      // Remove background image
      document.body.style.backgroundImage = 'none';
      document.body.classList.remove('with-bg-image');
      logger.info('Removed background image', { module: 'theme-utils' });
    }
    
    return true;
  } catch (err) {
    logger.error('Error applying background image:', err, { module: 'theme-utils' });
    return false;
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
