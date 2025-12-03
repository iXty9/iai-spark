import { ThemeColors } from '@/types/theme';

/**
 * Default theme colors for SupaThemes
 * 
 * NOTE: backgroundColor, primaryColor, textColor, and accentColor are included
 * for backward compatibility with existing saved themes, but they are NO LONGER
 * applied to Tailwind CSS variables. Tailwind's design tokens in index.css are
 * the single source of truth for base design colors.
 * 
 * Only the following are actively applied:
 * - Message bubble colors (user/ai)
 * - Name tag colors (user/ai)
 * - Markup element colors
 * - Proactive highlight color
 */

export const getDefaultLightTheme = (): ThemeColors => ({
  // DEPRECATED - kept for backward compatibility only
  backgroundColor: '#ffffff',
  primaryColor: '#dd3333',
  textColor: '#000000',
  accentColor: '#9b87f5',
  
  // Message bubble colors - ACTIVE
  userBubbleColor: '#dd3333',
  aiBubbleColor: '#9b87f5',
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: '#000000',
  aiTextColor: '#000000',
  
  // Name tag colors - ACTIVE
  userNameColor: '#666666',
  aiNameColor: '#666666',
  
  // Markup element colors - ACTIVE
  codeBlockBackground: '#f3f4f6',
  linkColor: '#2563eb',
  blockquoteColor: '#d1d5db',
  tableHeaderBackground: '#f9fafb',
  codeBlockTextColor: '#1f2937',
  linkTextColor: '#2563eb',
  blockquoteTextColor: '#4b5563',
  tableHeaderTextColor: '#111827',
  
  // Proactive highlight - ACTIVE
  proactiveHighlightColor: '#3b82f6'
});

export const getDefaultDarkTheme = (): ThemeColors => ({
  // DEPRECATED - kept for backward compatibility only
  backgroundColor: '#121212',
  primaryColor: '#dd3333',
  textColor: '#ffffff',
  accentColor: '#9b87f5',
  
  // Message bubble colors - ACTIVE
  userBubbleColor: '#dd3333',
  aiBubbleColor: '#9b87f5',
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: '#ffffff',
  aiTextColor: '#ffffff',
  
  // Name tag colors - ACTIVE
  userNameColor: '#cccccc',
  aiNameColor: '#cccccc',
  
  // Markup element colors - ACTIVE
  codeBlockBackground: '#374151',
  linkColor: '#60a5fa',
  blockquoteColor: '#6b7280',
  tableHeaderBackground: '#374151',
  codeBlockTextColor: '#f9fafb',
  linkTextColor: '#60a5fa',
  blockquoteTextColor: '#d1d5db',
  tableHeaderTextColor: '#f3f4f6',
  
  // Proactive highlight - ACTIVE
  proactiveHighlightColor: '#60a5fa'
});
