
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
  
  // ENHANCED: Complete markup styling fields with text color support
  codeBlockBackground?: string;
  linkColor?: string;
  blockquoteColor?: string;
  tableHeaderBackground?: string;
  
  // NEW: Text color properties for markup elements
  codeBlockTextColor?: string;
  linkTextColor?: string;
  blockquoteTextColor?: string;
  tableHeaderTextColor?: string;
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
  backgroundOpacity?: number;
  backgroundConfig?: {
    image?: string | null;
    opacity?: number;
    position?: string;
    blur?: number;
  };
  name?: string;
  exportDate?: string;
}
