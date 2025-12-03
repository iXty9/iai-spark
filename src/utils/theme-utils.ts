/**
 * Theme Utilities - SupaThemes specific only
 * 
 * IMPORTANT: This file only modifies SupaThemes user-customizable variables.
 * Tailwind's core design tokens (--background, --foreground, --primary, etc.)
 * are defined in index.css and should NOT be overwritten here.
 */

export const reloadTheme = () => {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const handleReloadTheme = reloadTheme;

// Debounce theme applications to prevent rapid successive calls
let themeApplicationTimeout: NodeJS.Timeout | null = null;
let pendingThemeColors: any = null;

const debouncedApplyTheme = (themeColors: any, delay: number = 16) => {
  pendingThemeColors = themeColors;
  
  if (themeApplicationTimeout) {
    clearTimeout(themeApplicationTimeout);
  }
  
  themeApplicationTimeout = setTimeout(() => {
    if (pendingThemeColors) {
      performThemeApplication(pendingThemeColors);
      pendingThemeColors = null;
    }
    themeApplicationTimeout = null;
  }, delay);
};

export const applyThemeChanges = (themeColors: any) => {
  if (typeof window === 'undefined') return;
  
  // Use debounced application to prevent theme thrashing
  debouncedApplyTheme(themeColors);
};

const performThemeApplication = (themeColors: any) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (!themeColors) return;

  // SupaThemes-specific color mappings ONLY
  // DO NOT add Tailwind core variables (--background, --foreground, --primary, etc.)
  const colorMappings: Record<string, string> = {
    // Message bubble colors - USER CUSTOMIZABLE
    userBubbleColor: '--user-bubble-color',
    aiBubbleColor: '--ai-bubble-color',
    userTextColor: '--user-text-color',
    aiTextColor: '--ai-text-color',
    
    // Name tag colors - USER CUSTOMIZABLE
    userNameColor: '--user-name-color',
    aiNameColor: '--ai-name-color',
    
    // Markup element background colors - USER CUSTOMIZABLE
    codeBlockBackground: '--markup-code-bg',
    linkColor: '--markup-link',
    blockquoteColor: '--markup-blockquote',
    tableHeaderBackground: '--markup-table-header',
    
    // Markup element text colors - USER CUSTOMIZABLE
    codeBlockTextColor: '--markup-code-text',
    linkTextColor: '--markup-link-text',
    blockquoteTextColor: '--markup-blockquote-text',
    tableHeaderTextColor: '--markup-table-header-text',
    
    // Proactive message highlight - USER CUSTOMIZABLE
    proactiveHighlightColor: '--proactive-highlight-color'
  };

  // Opacity mappings
  const opacityMappings: Record<string, string> = {
    userBubbleOpacity: '--user-bubble-opacity',
    aiBubbleOpacity: '--ai-bubble-opacity'
  };

  // Apply color mappings
  Object.entries(colorMappings).forEach(([key, cssVar]) => {
    const value = themeColors[key];
    if (value) {
      // Set the raw hex value for direct usage
      root.style.setProperty(cssVar, value);
      root.style.setProperty(`${cssVar}-hex`, value);
    }
  });

  // Apply opacity mappings
  Object.entries(opacityMappings).forEach(([key, cssVar]) => {
    const value = themeColors[key];
    if (value !== undefined) {
      root.style.setProperty(cssVar, String(value));
    }
  });

  // Log only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Applied SupaThemes customizations', { 
      bubbleColors: !!(themeColors.userBubbleColor || themeColors.aiBubbleColor),
      markupColors: !!(themeColors.codeBlockBackground || themeColors.linkColor),
      proactiveColor: !!themeColors.proactiveHighlightColor
    });
  }
};

export const applyBackgroundImage = (imageUrl: string | null, opacity: number, autoDimDarkMode: boolean = true) => {
  if (typeof window === 'undefined') return;
  
  const body = document.body;
  const root = document.documentElement;
  
  if (imageUrl) {
    // Remove any direct background styles from body - use only pseudo-element
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundAttachment = '';
    
    body.classList.add('with-bg-image');
    
    // Check if we're in dark mode
    const isDarkMode = root.classList.contains('dark');
    
    // Apply smart dimming based on mode and user preference
    const normalizedOpacity = Math.max(0, Math.min(1, opacity || 0.5));
    let finalOpacity = normalizedOpacity;
    
    // Only auto-dim in dark mode if the setting is enabled
    if (isDarkMode && autoDimDarkMode) {
      finalOpacity = normalizedOpacity * 0.15; // More reasonable dimming (15% of original)
    }
    
    root.style.setProperty('--bg-opacity', finalOpacity.toString());
    root.style.setProperty('--bg-image-url', `url("${imageUrl}")`);
    
    root.style.setProperty('--card-bg-opacity', '0.8');
    root.style.setProperty('--card-backdrop-blur', '12px');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Background image applied', { 
        hasImage: true, 
        originalOpacity: normalizedOpacity, 
        finalOpacity, 
        isDarkMode 
      });
    }
  } else {
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundRepeat = '';
    body.style.backgroundAttachment = '';
    
    body.classList.remove('with-bg-image');
    
    root.style.setProperty('--bg-opacity', '0.5');
    root.style.setProperty('--bg-image-url', 'none');
    root.style.setProperty('--card-bg-opacity', '1');
    root.style.setProperty('--card-backdrop-blur', '0px');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Background image removed');
    }
  }
};

const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

// Exported for potential use in other modules
export const hexToHsl = (hex: string): string => {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
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
  
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${hDeg} ${sPercent}% ${lPercent}%`;
};
