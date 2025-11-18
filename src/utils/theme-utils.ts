
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
  
  if (themeColors) {
    const colorMappings = {
      primaryColor: '--primary',
      accentColor: '--accent', 
      backgroundColor: '--background',
      
      textColor: [
        '--foreground',
        '--card-foreground', 
        '--popover-foreground',
        '--secondary-foreground',
        '--accent-foreground',
        '--muted-foreground',
        '--text-color'
      ],
      
      userBubbleColor: '--user-bubble-color',
      aiBubbleColor: '--ai-bubble-color',
      userTextColor: '--user-text-color',
      aiTextColor: '--ai-text-color',
      userNameColor: '--user-name-color',
      aiNameColor: '--ai-name-color',
      
      userBubbleOpacity: '--user-bubble-opacity',
      aiBubbleOpacity: '--ai-bubble-opacity',
      
      // ENHANCED: Complete markup color mapping with text color support
      codeBlockBackground: '--markup-code-bg',
      linkColor: '--markup-link',
      blockquoteColor: '--markup-blockquote',
      tableHeaderBackground: '--markup-table-header',
      
      // NEW: Text color mappings for markup elements
      codeBlockTextColor: '--markup-code-text',
      linkTextColor: '--markup-link-text',
      blockquoteTextColor: '--markup-blockquote-text',
      tableHeaderTextColor: '--markup-table-header-text',
      
      // NEW: Proactive highlight color mapping
      proactiveHighlightColor: '--proactive-highlight-color'
    };

    Object.entries(themeColors).forEach(([key, value]) => {
      if (key.includes('Opacity')) {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      else if (colorMappings[key]) {
        const mappings = Array.isArray(colorMappings[key]) ? colorMappings[key] : [colorMappings[key]];
        
        mappings.forEach(cssVar => {
          if (key.includes('Color') || key.includes('Background')) {
            const hslValue = hexToHsl(String(value));
            root.style.setProperty(cssVar, hslValue);
            
            if (key === 'textColor') {
              root.style.setProperty('--text-color-hex', String(value));
            }
            
            // ENHANCED: Set raw hex values for all markup colors for direct inline style usage
            if (key.startsWith('codeBlock') || key.startsWith('link') || key.startsWith('blockquote') || key.startsWith('tableHeader') || key === 'proactiveHighlightColor') {
              root.style.setProperty(`--${kebabCase(key)}-hex`, String(value));
            }
          } else {
            root.style.setProperty(cssVar, String(value));
          }
        });
        
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } 
      else {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      }
    });

    if (themeColors.textColor) {
      document.body.style.color = themeColors.textColor;
      
      const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, label, a, button, input, textarea, select');
      textElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        if (!htmlElement.style.color || htmlElement.style.color === '' || htmlElement.style.color === 'inherit') {
          htmlElement.style.color = 'inherit';
        }
      });
      
      document.body.offsetHeight;
    }

    // ENHANCED: Check for markup colors to determine if they're applied
    const markupColorsApplied = !!(
      themeColors.codeBlockBackground || 
      themeColors.linkColor || 
      themeColors.blockquoteColor || 
      themeColors.tableHeaderBackground ||
      themeColors.codeBlockTextColor ||
      themeColors.linkTextColor ||
      themeColors.blockquoteTextColor ||
      themeColors.tableHeaderTextColor ||
      themeColors.proactiveHighlightColor
    );

    // Reduce console noise - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Applied theme changes', { 
        textColorApplied: !!themeColors.textColor,
        markupColorsApplied,
        proactiveColorApplied: !!themeColors.proactiveHighlightColor
      });
    }
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

const hexToHsl = (hex: string): string => {
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
