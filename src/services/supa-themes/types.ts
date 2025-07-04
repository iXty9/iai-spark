import { ThemeColors, ThemeSettings } from '@/types/theme';

export interface SupaThemeState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  autoDimDarkMode: boolean;
  isReady: boolean;
  
  // Preview state for settings
  isInPreview: boolean;
  previewMode: 'light' | 'dark' | null;
  previewLightTheme: ThemeColors | null;
  previewDarkTheme: ThemeColors | null;
  previewBackgroundImage: string | null | undefined;
  previewBackgroundOpacity: number | null;
  previewAutoDimDarkMode: boolean | null;
  hasUnsavedChanges: boolean;
}

export type StateListener = (state: SupaThemeState) => void;