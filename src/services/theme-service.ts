import { ThemeColors, ThemeSettings } from '@/types/theme';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

export interface ThemeServiceConfig {
  enableTransitions?: boolean;
  fallbackToDefaults?: boolean;
  persistToLocalStorage?: boolean;
}

class ThemeService {
  private isInitialized = false;
  private defaultLightTheme: ThemeColors = {
    backgroundColor: '#ffffff',
    primaryColor: '#dd3333', // Company primary color
    textColor: '#000000',
    accentColor: '#9b87f5',
    userBubbleColor: '#dd3333', // Company primary color
    aiBubbleColor: '#9b87f5',
    userBubbleOpacity: 0.3,
    aiBubbleOpacity: 0.3,
    userTextColor: '#000000',
    aiTextColor: '#000000'
  };

  private defaultDarkTheme: ThemeColors = {
    backgroundColor: '#121212',
    primaryColor: '#dd3333', // Company primary color
    textColor: '#ffffff',
    accentColor: '#9b87f5',
    userBubbleColor: '#dd3333', // Company primary color
    aiBubbleColor: '#9b87f5',
    userBubbleOpacity: 0.3,
    aiBubbleOpacity: 0.3,
    userTextColor: '#ffffff',
    aiTextColor: '#ffffff'
  };

  private adminDefaults: ThemeSettings | null = null;

  /**
   * Initialize the theme service - this should be called early in app lifecycle
   */
  async initialize(config: ThemeServiceConfig = {}): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load admin defaults first (for signed-out users)
      await this.loadAdminDefaults();

      // Apply initial theme to prevent FOUC
      const mode = this.getStoredThemeMode() || 'light';
      const themeColors = this.getDefaultThemeColors(mode);
      this.applyThemeImmediate(themeColors, mode);

      this.isInitialized = true;
      logger.info('Theme service initialized successfully', { module: 'theme-service' });
    } catch (error) {
      logger.error('Failed to initialize theme service:', error, { module: 'theme-service' });
      // Apply fallback theme even if initialization fails
      this.applyThemeImmediate(this.defaultLightTheme, 'light');
      this.isInitialized = true;
    }
  }

  /**
   * Load admin-set default themes for signed-out users
   */
  private async loadAdminDefaults(): Promise<void> {
    try {
      const appSettings = await fetchAppSettings();
      if (appSettings?.default_theme_settings) {
        this.adminDefaults = JSON.parse(appSettings.default_theme_settings);
        logger.info('Admin default theme loaded', { module: 'theme-service' });
      }
    } catch (error) {
      logger.warn('Could not load admin defaults, using built-in defaults', error, { module: 'theme-service' });
    }
  }

  /**
   * Get default theme colors based on mode
   */
  getDefaultThemeColors(mode: 'light' | 'dark'): ThemeColors {
    if (this.adminDefaults) {
      const adminTheme = mode === 'light' ? this.adminDefaults.lightTheme : this.adminDefaults.darkTheme;
      if (adminTheme) return adminTheme;
    }
    
    return mode === 'light' ? this.defaultLightTheme : this.defaultDarkTheme;
  }

  /**
   * Get stored theme mode from localStorage
   */
  getStoredThemeMode(): 'light' | 'dark' | null {
    try {
      return localStorage.getItem('theme') as 'light' | 'dark' | null;
    } catch {
      return null;
    }
  }

  /**
   * Apply theme colors immediately to DOM (synchronous)
   */
  applyThemeImmediate(colors: ThemeColors, mode: 'light' | 'dark'): void {
    const root = document.documentElement;
    
    // Remove existing theme classes and add new one
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      if (key.includes('Opacity')) {
        root.style.setProperty(`--${this.kebabCase(key)}`, value.toString());
      } else {
        root.style.setProperty(`--${this.kebabCase(key)}`, value);
      }
    });

    // Update body styles immediately
    document.body.style.backgroundColor = colors.backgroundColor;
    document.body.style.color = colors.textColor;

    // Store theme mode
    try {
      localStorage.setItem('theme', mode);
    } catch (error) {
      logger.warn('Could not store theme mode to localStorage', error);
    }
  }

  /**
   * Apply background image and opacity - COMPLETELY FIXED
   */
  applyBackground(backgroundImage: string | null, opacity: number): void {
    const root = document.documentElement;
    const body = document.body;
    
    // Normalize opacity to ensure it's a number between 0 and 1
    const normalizedOpacity = Math.max(0, Math.min(1, Number(opacity) || 0.5));
    
    if (backgroundImage) {
      // Set background image
      body.style.backgroundImage = `url("${backgroundImage}")`;
      body.classList.add('with-bg-image');
      
      // Set CSS variable for opacity (CSS now uses calc(1 - var(--bg-opacity)))
      root.style.setProperty('--bg-opacity', normalizedOpacity.toString());
      root.style.setProperty('--bg-image-url', `url("${backgroundImage}")`);
      
      console.log('Applied background image with opacity:', normalizedOpacity);
    } else {
      // Remove background image
      body.style.backgroundImage = '';
      body.classList.remove('with-bg-image');
      root.style.setProperty('--bg-opacity', '0.5');
      root.style.setProperty('--bg-image-url', 'none');
      
      console.log('Removed background image');
    }
  }

  /**
   * Create a theme settings object
   */
  createThemeSettings(
    mode: 'light' | 'dark',
    lightTheme: ThemeColors,
    darkTheme: ThemeColors,
    backgroundImage?: string | null,
    backgroundOpacity?: number
  ): ThemeSettings {
    return {
      mode,
      lightTheme,
      darkTheme,
      backgroundImage: backgroundImage || null,
      backgroundOpacity: backgroundOpacity || 0.5, // Keep as number
      exportDate: new Date().toISOString(),
      name: 'Custom Theme'
    };
  }

  /**
   * Validate theme settings structure
   */
  validateThemeSettings(themeData: any): themeData is ThemeSettings {
    if (!themeData || typeof themeData !== 'object') return false;
    
    // Check required structure
    const hasValidMode = themeData.mode === 'light' || themeData.mode === 'dark';
    const hasLightTheme = themeData.lightTheme && typeof themeData.lightTheme === 'object';
    const hasDarkTheme = themeData.darkTheme && typeof themeData.darkTheme === 'object';
    
    if (!hasValidMode || !hasLightTheme || !hasDarkTheme) return false;

    // Validate color properties
    const requiredColorProps = [
      'backgroundColor', 'primaryColor', 'textColor', 'accentColor',
      'userBubbleColor', 'aiBubbleColor', 'userTextColor', 'aiTextColor'
    ];

    const validateThemeColors = (theme: any): boolean => {
      return requiredColorProps.every(prop => {
        const value = theme[prop];
        return typeof value === 'string' && this.isValidHexColor(value);
      });
    };

    return validateThemeColors(themeData.lightTheme) && validateThemeColors(themeData.darkTheme);
  }

  /**
   * Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Get admin defaults for fallback
   */
  getAdminDefaults(): ThemeSettings | null {
    return this.adminDefaults;
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

export const themeService = new ThemeService();
