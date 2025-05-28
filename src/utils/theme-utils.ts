
/**
 * Theme utility functions
 * Simple utilities for theme operations
 */

export const reloadTheme = () => {
  // Simple theme reload - just refresh the page for now
  // This is a simplified version to avoid complex theme management
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const handleReloadTheme = reloadTheme;

// Add missing theme functions that are being imported elsewhere
export const applyThemeChanges = (themeColors: any) => {
  // Apply theme changes to CSS variables
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
  const body = document.body;
  const root = document.documentElement;
  
  if (imageUrl) {
    body.style.backgroundImage = `url("${imageUrl}")`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundAttachment = 'scroll';
    body.classList.add('with-bg-image');
    
    const normalizedOpacity = Math.max(0, Math.min(1, opacity || 0.5));
    root.style.setProperty('--bg-opacity', normalizedOpacity.toString());
    root.style.setProperty('--bg-image-url', `url("${imageUrl}")`);
    
    if (window.innerWidth >= 768) {
      body.style.backgroundAttachment = 'fixed';
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
  }
};

// Helper function to convert camelCase to kebab-case
const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};
