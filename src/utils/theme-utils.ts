
/**
 * Theme utility functions
 * Enhanced utilities for theme operations with proper CSS variable mapping
 */

export const reloadTheme = () => {
  // Simple theme reload - just refresh the page for now
  // This is a simplified version to avoid complex theme management
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const handleReloadTheme = reloadTheme;

// Apply theme changes to CSS variables
export const applyThemeChanges = (themeColors: any) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (themeColors) {
    // Map theme colors to CSS variables
    const colorMappings = {
      primaryColor: '--primary',
      accentColor: '--accent',
      backgroundColor: '--background',
      textColor: '--foreground',
    };

    Object.entries(themeColors).forEach(([key, value]) => {
      // Handle opacity values
      if (key.includes('Opacity')) {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      // Handle color mappings to standard CSS variables
      else if (colorMappings[key]) {
        // Convert hex color to HSL for CSS variable compatibility
        const hslValue = hexToHsl(String(value));
        root.style.setProperty(colorMappings[key], hslValue);
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      // Handle other theme properties
      else {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      }
    });

    console.log('Applied theme changes with CSS variable mapping', { 
      themeColors,
      mappedVariables: Object.keys(colorMappings)
    });
  }
};

export const applyBackgroundImage = (imageUrl: string | null, opacity: number) => {
  if (typeof window === 'undefined') return;
  
  const body = document.body;
  const root = document.documentElement;
  
  if (imageUrl) {
    // Apply background image
    body.style.backgroundImage = `url("${imageUrl}")`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundAttachment = 'scroll';
    
    // Add glass effect class
    body.classList.add('with-bg-image');
    
    // Set CSS variables for glass effect
    const normalizedOpacity = Math.max(0, Math.min(1, opacity || 0.5));
    root.style.setProperty('--bg-opacity', normalizedOpacity.toString());
    root.style.setProperty('--bg-image-url', `url("${imageUrl}")`);
    
    // Use fixed attachment on larger screens for better effect
    if (window.innerWidth >= 768) {
      body.style.backgroundAttachment = 'fixed';
    }
    
    // Force glass effect styles
    root.style.setProperty('--card-bg-opacity', '0.8');
    root.style.setProperty('--card-backdrop-blur', '12px');
    
    console.log('Background image applied with glass effect', { 
      imageUrl, 
      opacity: normalizedOpacity,
      hasClass: body.classList.contains('with-bg-image')
    });
  } else {
    // Remove background image
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundAttachment = '';
    
    // Remove glass effect class
    body.classList.remove('with-bg-image');
    
    // Reset CSS variables
    root.style.setProperty('--bg-opacity', '0.5');
    root.style.setProperty('--bg-image-url', 'none');
    root.style.setProperty('--card-bg-opacity', '1');
    root.style.setProperty('--card-backdrop-blur', '0px');
    
    console.log('Background image removed');
  }
};

// Helper function to convert camelCase to kebab-case
const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

// Helper function to convert hex to HSL for CSS variables
const hexToHsl = (hex: string): string => {
  // Remove the hash if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find the min and max values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  // Convert to CSS HSL format (hue in degrees, saturation and lightness as percentages)
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${hDeg} ${sPercent}% ${lPercent}%`;
};
