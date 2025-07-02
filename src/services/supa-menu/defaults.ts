import { MenuConfig, MenuTheme, MenuPosition } from './types';

export const getDefaultMenuPosition = (): MenuPosition => ({
  align: 'center',
  side: 'bottom',
  centered: true
});

export const getDefaultLightMenuTheme = (): MenuTheme => ({
  backgroundColor: 'hsl(var(--background))',
  backgroundOpacity: 0.95,
  borderColor: 'hsl(var(--border))',
  borderOpacity: 0.3,
  textColor: 'hsl(var(--foreground))',
  hoverBackgroundColor: 'hsl(var(--primary))',
  hoverBackgroundOpacity: 0.1,
  hoverTextColor: 'hsl(var(--primary))',
  backdropBlur: 12,
  borderRadius: 12,
  shadowColor: 'hsl(0 0% 0%)',
  shadowOpacity: 0.1
});

export const getDefaultDarkMenuTheme = (): MenuTheme => ({
  backgroundColor: 'hsl(var(--background))',
  backgroundOpacity: 0.95,
  borderColor: 'hsl(var(--border))',
  borderOpacity: 0.3,
  textColor: 'hsl(var(--foreground))',
  hoverBackgroundColor: 'hsl(var(--primary))',
  hoverBackgroundOpacity: 0.1,
  hoverTextColor: 'hsl(var(--primary))',
  backdropBlur: 12,
  borderRadius: 12,
  shadowColor: 'hsl(0 0% 0%)',
  shadowOpacity: 0.3
});

export const getDefaultMenuConfig = (): MenuConfig => ({
  position: getDefaultMenuPosition(),
  theme: getDefaultLightMenuTheme(),
  animation: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  responsive: {
    mobileBreakpoint: 768,
    showIconsOnMobile: true,
    compactOnMobile: true
  }
});