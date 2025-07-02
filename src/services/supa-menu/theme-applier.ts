import { MenuTheme } from './types';
import { logger } from '@/utils/logging';

export class MenuThemeApplier {
  private static readonly CSS_VAR_PREFIX = '--supa-menu-';

  applyMenuTheme(theme: MenuTheme): void {
    try {
      const root = document.documentElement;
      
      // Apply CSS variables for menu theming
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}bg`, theme.backgroundColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}bg-opacity`, theme.backgroundOpacity.toString());
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}border`, theme.borderColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}border-opacity`, theme.borderOpacity.toString());
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}text`, theme.textColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}hover-bg`, theme.hoverBackgroundColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}hover-bg-opacity`, theme.hoverBackgroundOpacity.toString());
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}hover-text`, theme.hoverTextColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}backdrop-blur`, `${theme.backdropBlur}px`);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}border-radius`, `${theme.borderRadius}px`);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}shadow`, theme.shadowColor);
      root.style.setProperty(`${MenuThemeApplier.CSS_VAR_PREFIX}shadow-opacity`, theme.shadowOpacity.toString());

      logger.debug('Menu theme applied successfully', { module: 'supa-menu' });
    } catch (error) {
      logger.error('Failed to apply menu theme:', error, { module: 'supa-menu' });
    }
  }
}