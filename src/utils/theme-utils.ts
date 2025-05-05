
import { ThemeColors } from "@/types/theme";
import { logger } from "@/utils/logging";

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
  
  // Calculate link color based on theme - links should contrast with background
  // Use a shade of the primary color or accent color for better visibility
  const linkColor = calculateContrastingLinkColor(
    themeColors.backgroundColor, 
    themeColors.primaryColor, 
    themeColors.aiTextColor
  );
  root.style.setProperty('--link-color', linkColor);
  
  // Also update the body background color for immediate feedback
  document.body.style.backgroundColor = themeColors.backgroundColor;
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
 * Returns true if background was applied, false otherwise
 */
export const applyBackgroundImage = (image: string | null, opacity: number): boolean => {
  const root = document.documentElement;
  
  try {
    // Add loading state class to body
    if (image) {
      document.body.classList.add('loading-bg-image');
    }
    
    // Set the opacity CSS variable first
    root.style.setProperty('--bg-opacity', opacity.toString());
    
    if (image) {
      // Log the application of background image
      logger.info('Applying background image to body', { 
        module: 'theme-utils',
        imageType: image.startsWith('data:') ? 'data-url' : 'url',
        imageStart: image.substring(0, 20) + '...'
      });
      
      // Apply background image to body with specific CSS 
      document.body.style.backgroundImage = `url("${image}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.classList.add('with-bg-image');
      
      // Force a repaint to ensure the background is applied
      document.body.style.display = 'none';
      document.body.offsetHeight; // Force reflow
      document.body.style.display = '';
      
      // Setup a verification check
      setTimeout(() => {
        // Remove loading state
        document.body.classList.remove('loading-bg-image');
        
        if (!document.body.style.backgroundImage || 
            document.body.style.backgroundImage === 'none' || 
            document.body.style.backgroundImage === '') {
          logger.warn('Background image did not apply correctly, retrying', { module: 'theme-utils' });
          document.body.style.backgroundImage = `url("${image}")`;
          
          // Perform a second verification
          setTimeout(() => {
            const hasBackground = document.body.style.backgroundImage && 
                               document.body.style.backgroundImage !== 'none' &&
                               document.body.style.backgroundImage !== '';
            
            logger.info('Second verification check for background', { 
              module: 'theme-utils',
              hasBackground,
              backgroundImage: document.body.style.backgroundImage
            });
            
            if (!hasBackground) {
              // One last try with a different approach
              const imgUrl = image.startsWith('data:') ? image : `url("${image}")`;
              document.body.setAttribute('style', `
                background-image: ${imgUrl};
                background-size: cover;
                background-position: center center;
                background-repeat: no-repeat;
                background-attachment: fixed;
              `);
            }
          }, 500);
        }
      }, 200);
      
      return true;
    } else {
      // Remove background image
      logger.info('Removing background image', { module: 'theme-utils' });
      document.body.style.backgroundImage = 'none';
      document.body.classList.remove('with-bg-image');
      document.body.classList.remove('loading-bg-image');
      return true;
    }
  } catch (error) {
    logger.error('Error applying background image', error, { module: 'theme-utils' });
    // Ensure we don't leave the body in a broken state
    document.body.style.display = '';
    document.body.classList.remove('loading-bg-image');
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
