/**
 * Theme utility functions
 * Enhanced utilities for theme operations with complete CSS variable mapping
 */

export const reloadTheme = () => {
  // Simple theme reload - just refresh the page for now
  // This is a simplified version to avoid complex theme management
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const handleReloadTheme = reloadTheme;

// Apply theme changes to CSS variables - COMPLETE MAPPING WITH COMPREHENSIVE TEXT COLOR FIX AND MARKUP SUPPORT
export const applyThemeChanges = (themeColors: any) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (themeColors) {
    // Complete mapping of ALL theme colors to CSS variables with comprehensive text color support
    const colorMappings = {
      // Core theme colors
      primaryColor: '--primary',
      accentColor: '--accent', 
      backgroundColor: '--background',
      
      // COMPREHENSIVE TEXT COLOR MAPPING - Map to ALL text-related CSS variables
      textColor: [
        '--foreground',
        '--card-foreground', 
        '--popover-foreground',
        '--secondary-foreground',
        '--accent-foreground',
        '--muted-foreground',
        '--text-color' // Custom variable for direct reference
      ],
      
      // Message bubble colors - map to custom variables
      userBubbleColor: '--user-bubble-color',
      aiBubbleColor: '--ai-bubble-color',
      userTextColor: '--user-text-color',
      aiTextColor: '--ai-text-color',
      
      // Name tag colors - ENHANCED: Apply to all name-related elements
      userNameColor: '--user-name-color',
      aiNameColor: '--ai-name-color',
      
      // Opacity values
      userBubbleOpacity: '--user-bubble-opacity',
      aiBubbleOpacity: '--ai-bubble-opacity',
      
      // NEW: Markup element colors
      codeBlockBackground: '--markup-code-bg',
      linkColor: '--markup-link',
      blockquoteColor: '--markup-blockquote',
      tableHeaderBackground: '--markup-table-header'
    };

    Object.entries(themeColors).forEach(([key, value]) => {
      // Handle opacity values (keep as is)
      if (key.includes('Opacity')) {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      // Handle comprehensive color mappings
      else if (colorMappings[key]) {
        const mappings = Array.isArray(colorMappings[key]) ? colorMappings[key] : [colorMappings[key]];
        
        mappings.forEach(cssVar => {
          if (key.includes('Color') || key.includes('Background')) {
            // Convert hex color to HSL for standard CSS variable compatibility
            const hslValue = hexToHsl(String(value));
            root.style.setProperty(cssVar, hslValue);
            
            // For textColor, also set the raw hex value for direct usage
            if (key === 'textColor') {
              root.style.setProperty('--text-color-hex', String(value));
            }
          } else {
            // Set the raw value for non-color properties
            root.style.setProperty(cssVar, String(value));
          }
        });
        
        // Also set kebab-case version for backwards compatibility
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      // Handle other theme properties
      else {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      }
    });

    // CRITICAL: Force immediate text color update on body and document
    if (themeColors.textColor) {
      document.body.style.color = themeColors.textColor;
      
      // Update all text elements immediately with proper casting
      const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, label, a, button, input, textarea, select');
      textElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        // Only update if the element doesn't have an explicit color set
        if (!htmlElement.style.color || htmlElement.style.color === '' || htmlElement.style.color === 'inherit') {
          htmlElement.style.color = 'inherit';
        }
      });
      
      // Force a repaint to ensure changes are visible immediately
      document.body.offsetHeight;
    }

    console.log('Applied comprehensive theme changes with FULL text color mapping including markup colors', { 
      themeColors,
      mappedVariables: Object.keys(colorMappings),
      textColorApplied: !!themeColors.textColor,
      markupColorsApplied: !!(themeColors.codeBlockBackground || themeColors.linkColor || themeColors.blockquoteColor || themeColors.tableHeaderBackground)
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
