import { ThemeColors } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { SupaThemeState } from './types';

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