import { LucideIcon } from 'lucide-react';

export interface MenuPosition {
  align: 'start' | 'center' | 'end';
  side: 'top' | 'bottom' | 'left' | 'right';
  centered: boolean; // Forces viewport centering regardless of trigger position
}

export interface MenuTheme {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderOpacity: number;
  textColor: string;
  hoverBackgroundColor: string;
  hoverBackgroundOpacity: number;
  hoverTextColor: string;
  backdropBlur: number;
  borderRadius: number;
  shadowColor: string;
  shadowOpacity: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  shortLabel?: string; // For mobile display
  hidden?: boolean;
  separator?: boolean; // Show separator after this item
}

export interface MenuConfig {
  position: MenuPosition;
  theme: MenuTheme;
  animation: {
    duration: number;
    easing: string;
  };
  responsive: {
    mobileBreakpoint: number;
    showIconsOnMobile: boolean;
    compactOnMobile: boolean;
  };
}

export interface SupaMenuState {
  config: MenuConfig;
  isReady: boolean;
  adminMenuSettings?: MenuConfig; // Admin-customizable settings
}

export type MenuStateListener = (state: SupaMenuState) => void;