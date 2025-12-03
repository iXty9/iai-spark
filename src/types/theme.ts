export interface ThemeColors {
  // DEPRECATED: These are kept for backward compatibility but no longer applied to Tailwind
  // Tailwind's design tokens in index.css are the source of truth for base colors
  backgroundColor?: string;
  primaryColor?: string;
  textColor?: string;
  accentColor?: string;
  
  // Message bubble colors - USER CUSTOMIZABLE via Settings > Appearance
  userBubbleColor: string;
  aiBubbleColor: string;
  userBubbleOpacity: number;
  aiBubbleOpacity: number;
  userTextColor: string;
  aiTextColor: string;
  
  // Name tag colors - USER CUSTOMIZABLE via Settings > Appearance
  userNameColor: string;
  aiNameColor: string;
  
  // Markup element background colors - USER CUSTOMIZABLE via Settings > Markup
  codeBlockBackground?: string;
  linkColor?: string;
  blockquoteColor?: string;
  tableHeaderBackground?: string;
  
  // Markup element text colors - USER CUSTOMIZABLE via Settings > Markup
  codeBlockTextColor?: string;
  linkTextColor?: string;
  blockquoteTextColor?: string;
  tableHeaderTextColor?: string;
  
  // Proactive message highlight color
  proactiveHighlightColor?: string;
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
  autoDimDarkMode?: boolean;
  backgroundConfig?: {
    image?: string | null;
    opacity?: number;
    position?: string;
    blur?: number;
  };
  name?: string;
  exportDate?: string;
}
