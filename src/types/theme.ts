
export interface ThemeColors {
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  userBubbleColor: string;
  aiBubbleColor: string;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: string;
}
