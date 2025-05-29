export interface ThemeColors {
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  userBubbleColor: string;
  aiBubbleColor: string;
  userBubbleOpacity: number;
  aiBubbleOpacity: number;
  userTextColor: string;
  aiTextColor: string;
  userNameColor: string;
  aiNameColor: string;
}

export interface ThemeSettings {
  mode?: 'light' | 'dark';
  colors?: {
    light?: Partial<ThemeColors>;
    dark?: Partial<ThemeColors>;
  };
  lightTheme?: ThemeColors;
  darkTheme?: ThemeColors;
  backgroundImage?: string | null;
  backgroundOpacity?: number; // FIXED: Always number, not string
  backgroundConfig?: {
    image?: string | null;
    opacity?: number;
    position?: string;
    blur?: number;
  };
  name?: string;
  exportDate?: string;
}
