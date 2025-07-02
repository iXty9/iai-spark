import { ThemeColors } from '@/types/theme';
import { applyBackgroundImage } from '@/utils/theme-utils';
import { SupaThemeState } from './types';
import { ThemeApplier } from './theme-applier';

export class PreviewManager {
  constructor(private themeApplier: ThemeApplier) {}

  enterPreviewMode(state: SupaThemeState): void {
    if (state.isInPreview) return;
    
    state.isInPreview = true;
    state.previewMode = state.mode;
    state.hasUnsavedChanges = false;
  }

  exitPreviewMode(state: SupaThemeState, save: boolean = false): void {
    if (!state.isInPreview) return;
    
    if (!save) {
      // Revert to original state
      this.themeApplier.applyCurrentTheme(state);
      this.themeApplier.applyCurrentBackground(state);
    }
    
    state.isInPreview = false;
    state.previewMode = null;
    state.previewLightTheme = null;
    state.previewDarkTheme = null;
    state.previewBackgroundImage = undefined;
    state.previewBackgroundOpacity = null;
    state.hasUnsavedChanges = false;
  }

  previewMode(state: SupaThemeState, mode: 'light' | 'dark'): void {
    if (!state.isInPreview) this.enterPreviewMode(state);
    
    state.previewMode = mode;
    state.hasUnsavedChanges = true;
    this.themeApplier.applyCurrentTheme(state);
  }

  previewLightTheme(state: SupaThemeState, theme: ThemeColors): void {
    if (!state.isInPreview) this.enterPreviewMode(state);
    
    state.previewLightTheme = theme;
    state.hasUnsavedChanges = true;
    
    if ((state.previewMode || state.mode) === 'light') {
      this.themeApplier.applyCurrentTheme(state);
    }
  }

  previewDarkTheme(state: SupaThemeState, theme: ThemeColors): void {
    if (!state.isInPreview) this.enterPreviewMode(state);
    
    state.previewDarkTheme = theme;
    state.hasUnsavedChanges = true;
    
    if ((state.previewMode || state.mode) === 'dark') {
      this.themeApplier.applyCurrentTheme(state);
    }
  }

  previewBackgroundImage(state: SupaThemeState, image: string | null): void {
    if (!state.isInPreview) this.enterPreviewMode(state);
    
    state.previewBackgroundImage = image;
    state.hasUnsavedChanges = true;
    
    const opacity = state.previewBackgroundOpacity ?? state.backgroundOpacity;
    applyBackgroundImage(image, opacity);
  }

  previewBackgroundOpacity(state: SupaThemeState, opacity: number): void {
    if (!state.isInPreview) this.enterPreviewMode(state);
    
    state.previewBackgroundOpacity = opacity;
    state.hasUnsavedChanges = true;
    
    const image = state.previewBackgroundImage !== undefined 
      ? state.previewBackgroundImage 
      : state.backgroundImage;
    applyBackgroundImage(image, opacity);
  }

  commitPreviewChanges(state: SupaThemeState): void {
    if (!state.isInPreview) return;

    if (state.previewMode !== null) state.mode = state.previewMode;
    if (state.previewLightTheme) state.lightTheme = state.previewLightTheme;
    if (state.previewDarkTheme) state.darkTheme = state.previewDarkTheme;
    if (state.previewBackgroundImage !== undefined) state.backgroundImage = state.previewBackgroundImage;
    if (state.previewBackgroundOpacity !== null) state.backgroundOpacity = state.previewBackgroundOpacity;
  }
}