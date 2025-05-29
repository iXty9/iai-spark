
import { useEffect, useState, useRef, useCallback } from 'react';
import { getContrastRatio, suggestAccessibleColor } from '@/utils/color-contrast';

interface DynamicContrastOptions {
  enabled?: boolean;
  fallbackColor?: string;
  isLargeText?: boolean;
}

interface ContrastState {
  textColor: string;
  isHighContrast: boolean;
  backgroundLuminance: number;
}

export const useDynamicContrast = (
  elementRef: React.RefObject<HTMLElement>,
  options: DynamicContrastOptions = {}
) => {
  const {
    enabled = true,
    fallbackColor = '#000000',
    isLargeText = false
  } = options;

  const [contrastState, setContrastState] = useState<ContrastState>({
    textColor: fallbackColor,
    isHighContrast: false,
    backgroundLuminance: 0.5
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef<number>();

  // Sample background color at element position
  const sampleBackgroundColor = useCallback(() => {
    if (!elementRef.current || !enabled) return fallbackColor;

    try {
      const element = elementRef.current;
      const rect = element.getBoundingClientRect();
      
      // Get computed styles to check for background colors
      const computedStyle = getComputedStyle(element);
      let backgroundColor = computedStyle.backgroundColor;
      
      // If transparent, traverse up the DOM tree
      let parent = element.parentElement;
      while (parent && (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent')) {
        const parentStyle = getComputedStyle(parent);
        backgroundColor = parentStyle.backgroundColor;
        parent = parent.parentElement;
      }
      
      // If still transparent, check body background
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        const bodyStyle = getComputedStyle(document.body);
        backgroundColor = bodyStyle.backgroundColor;
        
        // Check for background image on body
        if (bodyStyle.backgroundImage && bodyStyle.backgroundImage !== 'none') {
          // For background images, use a middle-ground approach
          const isDarkMode = document.documentElement.classList.contains('dark');
          return isDarkMode ? '#ffffff' : '#000000';
        }
      }
      
      // Convert RGB/RGBA to hex
      return rgbaToHex(backgroundColor);
    } catch (error) {
      console.warn('Failed to sample background color:', error);
      return fallbackColor;
    }
  }, [elementRef, enabled, fallbackColor]);

  // Calculate optimal text color based on background
  const calculateOptimalTextColor = useCallback((backgroundColor: string) => {
    try {
      // Get current theme colors
      const isDarkMode = document.documentElement.classList.contains('dark');
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color').trim() || '#dd3333';
      
      // Test different color options
      const colorOptions = [
        '#000000', // Black
        '#ffffff', // White
        isDarkMode ? '#e5e5e5' : '#1a1a1a', // Theme-appropriate gray
        primaryColor // Primary theme color
      ];
      
      let bestColor = fallbackColor;
      let bestRatio = 0;
      
      // Find the color with the best contrast ratio
      for (const color of colorOptions) {
        const ratio = getContrastRatio(color, backgroundColor);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestColor = color;
        }
      }
      
      // Ensure minimum contrast standards
      const finalColor = suggestAccessibleColor(bestColor, backgroundColor, isLargeText);
      
      return {
        textColor: finalColor,
        isHighContrast: bestRatio >= (isLargeText ? 4.5 : 7),
        backgroundLuminance: getLuminanceFromHex(backgroundColor)
      };
    } catch (error) {
      console.warn('Failed to calculate optimal text color:', error);
      return {
        textColor: fallbackColor,
        isHighContrast: false,
        backgroundLuminance: 0.5
      };
    }
  }, [fallbackColor, isLargeText]);

  // Update contrast state
  const updateContrast = useCallback(() => {
    const backgroundColor = sampleBackgroundColor();
    const newState = calculateOptimalTextColor(backgroundColor);
    
    setContrastState(prev => {
      // Only update if there's a meaningful change
      if (prev.textColor !== newState.textColor) {
        return newState;
      }
      return prev;
    });
  }, [sampleBackgroundColor, calculateOptimalTextColor]);

  // Debounced update function
  const debouncedUpdate = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(updateContrast);
  }, [updateContrast]);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    // Initial calculation
    updateContrast();

    // Set up intersection observer for scroll detection
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debouncedUpdate();
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    // Listen for theme changes
    const handleThemeChange = () => debouncedUpdate();
    window.addEventListener('storage', handleThemeChange);
    
    // Listen for scroll events (throttled)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(debouncedUpdate, 16); // ~60fps
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [enabled, elementRef, debouncedUpdate, updateContrast]);

  return contrastState;
};

// Helper functions
function rgbaToHex(rgba: string): string {
  try {
    const rgbaMatch = rgba.match(/rgba?\(([^)]+)\)/);
    if (!rgbaMatch) return '#000000';
    
    const values = rgbaMatch[1].split(',').map(v => parseInt(v.trim()));
    const [r, g, b] = values;
    
    return '#' + 
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');
  } catch {
    return '#000000';
  }
}

function getLuminanceFromHex(hex: string): number {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
  } catch {
    return 0.5;
  }
}
