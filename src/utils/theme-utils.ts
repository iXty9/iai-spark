
/**
 * Theme utility functions
 * Enhanced utilities for theme operations with proper glass effect support
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
    Object.entries(themeColors).forEach(([key, value]) => {
      if (key.includes('Opacity')) {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      } else {
        root.style.setProperty(`--${kebabCase(key)}`, String(value));
      }
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
