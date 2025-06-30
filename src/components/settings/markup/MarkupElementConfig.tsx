
import { Code, Link, Quote, Table } from 'lucide-react';
import { ThemeColors } from '@/types/theme';

export interface MarkupElement {
  key: string;
  textKey: string;
  label: string;
  backgroundValue: string;
  textValue: string;
  icon: typeof Code;
  description: string;
}

export const getMarkupElements = (colors: ThemeColors): MarkupElement[] => [
  {
    key: 'codeBlockBackground',
    textKey: 'codeBlockTextColor',
    label: 'Code Block',
    backgroundValue: colors.codeBlockBackground || '#f3f4f6',
    textValue: colors.codeBlockTextColor || '#1f2937',
    icon: Code,
    description: 'Background and text colors for code blocks and inline code'
  },
  {
    key: 'linkColor',
    textKey: 'linkTextColor',
    label: 'Links',
    backgroundValue: colors.linkColor || '#2563eb',
    textValue: colors.linkTextColor || '#2563eb',
    icon: Link,
    description: 'Hover background and text colors for clickable links'
  },
  {
    key: 'blockquoteColor',
    textKey: 'blockquoteTextColor',
    label: 'Blockquote',
    backgroundValue: colors.blockquoteColor || '#d1d5db',
    textValue: colors.blockquoteTextColor || '#4b5563',
    icon: Quote,
    description: 'Border and text colors for quoted text blocks'
  },
  {
    key: 'tableHeaderBackground',
    textKey: 'tableHeaderTextColor',
    label: 'Table Header',
    backgroundValue: colors.tableHeaderBackground || '#f9fafb',
    textValue: colors.tableHeaderTextColor || '#111827',
    icon: Table,
    description: 'Background and text colors for table headers'
  }
];
