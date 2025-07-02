import { ThemeColors, ThemeSettings } from '@/types/theme';

export interface SupaThemeState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  isReady: boolean;
  
  // Preview state for settings
  isInPreview: boolean;
  previewMode: 'light' | 'dark' | null;
  previewLightTheme: ThemeColors | null;
  previewDarkTheme: ThemeColors | null;
  previewBackgroundImage: string | null | undefined;
  previewBackgroundOpacity: number | null;
  hasUnsavedChanges: boolean;
}

export type StateListener = (state: SupaThemeState) => void;