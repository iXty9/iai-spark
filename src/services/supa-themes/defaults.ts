import { ThemeColors } from '@/types/theme';

export const getDefaultLightTheme = (): ThemeColors => ({
  backgroundColor: '#ffffff',
  primaryColor: '#dd3333',
  textColor: '#000000',
  accentColor: '#9b87f5',
  userBubbleColor: '#dd3333',
  aiBubbleColor: '#9b87f5',
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: '#000000',
  aiTextColor: '#000000',
  userNameColor: '#666666',
  aiNameColor: '#666666',
  codeBlockBackground: '#f3f4f6',
  linkColor: '#2563eb',
  blockquoteColor: '#d1d5db',
  tableHeaderBackground: '#f9fafb',
  codeBlockTextColor: '#1f2937',
  linkTextColor: '#2563eb',
  blockquoteTextColor: '#4b5563',
  tableHeaderTextColor: '#111827',
  proactiveHighlightColor: '#3b82f6'
});

export const getDefaultDarkTheme = (): ThemeColors => ({
  backgroundColor: '#121212',
  primaryColor: '#dd3333',
  textColor: '#ffffff',
  accentColor: '#9b87f5',
  userBubbleColor: '#dd3333',
  aiBubbleColor: '#9b87f5',
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: '#ffffff',
  aiTextColor: '#ffffff',
  userNameColor: '#cccccc',
  aiNameColor: '#cccccc',
  codeBlockBackground: '#374151',
  linkColor: '#60a5fa',
  blockquoteColor: '#6b7280',
  tableHeaderBackground: '#374151',
  codeBlockTextColor: '#f9fafb',
  linkTextColor: '#60a5fa',
  blockquoteTextColor: '#d1d5db',
  tableHeaderTextColor: '#f3f4f6',
  proactiveHighlightColor: '#60a5fa'
});