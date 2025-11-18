import { ThemeColors } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { SupaThemeState } from './types';

// Immediate theme application to prevent flash of wrong theme
export const applyImmediateDocumentTheme = (mode: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  
  // Force light mode for fresh loads to prevent OS dark mode interference
  // This ensures anonymous users always start in light mode regardless of OS preference
  const actualMode = mode;
  
  // Apply theme class immediately to document
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(actualMode);
  
  // Set a CSS variable for immediate styling
  document.documentElement.style.setProperty('--theme-mode', actualMode);
};

export class ThemeApplier {
  applyCurrentTheme(state: SupaThemeState): void {
    const currentTheme = this.getCurrentTheme(state);
    applyThemeChanges(currentTheme);
    this.updateDocumentMode(state);
  }

  applyCurrentBackground(state: SupaThemeState): void {
    const image = state.previewBackgroundImage !== undefined 
      ? state.previewBackgroundImage 
      : state.backgroundImage;
    const opacity = state.previewBackgroundOpacity ?? state.backgroundOpacity;
    const autoDim = state.previewAutoDimDarkMode ?? state.autoDimDarkMode;
    applyBackgroundImage(image, opacity, autoDim);
  }

  private updateDocumentMode(state: SupaThemeState): void {
    const mode = state.previewMode || state.mode;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
    
    // Store current mode in sessionStorage for pre-React initialization
    try {
      sessionStorage.setItem('bootstrap_current_theme_mode', mode);
    } catch (e) {
      // Silent fail - not critical
    }
  }

  private getCurrentTheme(state: SupaThemeState): ThemeColors {
    const mode = state.previewMode || state.mode;
    
    if (mode === 'light') {
      return state.previewLightTheme || state.lightTheme;
    } else {
      return state.previewDarkTheme || state.darkTheme;
    }
  }
}