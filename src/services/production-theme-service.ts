import { ThemeColors, ThemeSettings } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';

export interface ThemeState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  isReady: boolean;
}

class ProductionThemeService {
  private state: ThemeState;
  private listeners: Set<(state: ThemeState) => void> = new Set();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.state = {
      mode: 'light',
      lightTheme: this.getDefaultLightTheme(),
      darkTheme: this.getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5,
      isReady: false
    };
  }

  private getDefaultLightTheme(): ThemeColors {
    return {
      backgroundColor: '#ffffff',
      primaryColor: '#dd3333',
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#000000',
      aiTextColor: '#000000'
    };
  }

  private getDefaultDarkTheme(): ThemeColors {
    return {
      backgroundColor: '#121212',
      primaryColor: '#dd3333',
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#ffffff',
      aiTextColor: '#ffffff'
    };
  }

  async initialize(userSettings?: ThemeSettings, forceReinit = false): Promise<void> {
    // Allow forced reinitialization for fresh data loading
    if (forceReinit) {
      this.isInitialized = false;
      this.initializationPromise = null;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized && !forceReinit) {
      return Promise.resolve();
    }

    this.initializationPromise = this.performInitialization(userSettings);
    return this.initializationPromise;
  }

  private async performInitialization(userSettings?: ThemeSettings): Promise<void> {
    try {
      logger.info('Initializing production theme service', { 
        module: 'production-theme',
        hasUserSettings: !!userSettings
      });

      if (userSettings && this.validateThemeSettings(userSettings)) {
        this.state = {
          mode: userSettings.mode || 'light',
          lightTheme: userSettings.lightTheme || this.getDefaultLightTheme(),
          darkTheme: userSettings.darkTheme || this.getDefaultDarkTheme(),
          backgroundImage: userSettings.backgroundImage || null,
          backgroundOpacity: this.normalizeOpacity(userSettings.backgroundOpacity || 0.5),
          isReady: true
        };
        
        logger.info('Initialized with user settings', { 
          module: 'production-theme',
          backgroundImage: !!this.state.backgroundImage
        });
      } else {
        // Try to load default theme from database
        try {
          const appSettings = await fetchAppSettings();
          if (appSettings.default_theme_settings) {
            const defaultSettings = JSON.parse(appSettings.default_theme_settings);
            
            if (this.validateThemeSettings(defaultSettings)) {
              this.state.lightTheme = defaultSettings.lightTheme || this.getDefaultLightTheme();
              this.state.darkTheme = defaultSettings.darkTheme || this.getDefaultDarkTheme();
              this.state.backgroundImage = defaultSettings.backgroundImage || null;
              this.state.backgroundOpacity = this.normalizeOpacity(defaultSettings.backgroundOpacity || 0.5);
              
              logger.info('Loaded default theme from database', { module: 'production-theme' });
            }
          }
        } catch (error) {
          logger.warn('Could not load default theme from database, using hardcoded defaults', error);
        }
        
        this.state.isReady = true;
        logger.info('Initialized with default settings', { module: 'production-theme' });
      }

      // Apply theme and background immediately with complete mapping
      this.applyCurrentTheme();
      this.applyCurrentBackground();
      
      this.isInitialized = true;
      this.initializationPromise = null;
      
      this.notifyListeners();
      
      logger.info('Production theme service initialized', { 
        module: 'production-theme',
        mode: this.state.mode
      });
    } catch (error) {
      logger.error('Failed to initialize production theme service:', error);
      this.state.isReady = true;
      this.isInitialized = true;
      this.initializationPromise = null;
      this.notifyListeners();
    }
  }

  private validateThemeSettings(settings: ThemeSettings): boolean {
    return settings && typeof settings === 'object';
  }

  private normalizeOpacity(opacity: any): number {
    if (typeof opacity === 'string') {
      const parsed = parseFloat(opacity);
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return Math.max(0, Math.min(1, opacity || 0.5));
  }

  getState(): ThemeState {
    return { ...this.state };
  }

  subscribe(listener: (state: ThemeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Core setters that immediately apply changes
  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.applyCurrentTheme();
    this.notifyListeners();
    logger.info('Theme mode changed', { module: 'production-theme', mode });
  }

  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light') {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark') {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
  }

  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    this.applyCurrentBackground();
    this.notifyListeners();
    logger.info('Background image updated', { 
      module: 'production-theme', 
      hasImage: !!image 
    });
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = this.normalizeOpacity(opacity);
    this.applyCurrentBackground();
    this.notifyListeners();
    logger.info('Background opacity updated', { 
      module: 'production-theme', 
      opacity: this.state.backgroundOpacity 
    });
  }

  // Preview methods that don't update state but apply visual changes
  previewTheme(colors: ThemeColors, mode: 'light' | 'dark'): void {
    // Use the enhanced applyThemeChanges function with complete mapping
    applyThemeChanges(colors);
    logger.info('Theme preview applied with complete color mapping', { module: 'production-theme', mode });
  }

  previewBackground(image: string | null, opacity: number): void {
    applyBackgroundImage(image, opacity);
    // Ensure glass effect is enabled
    if (image) {
      document.body.classList.add('with-bg-image');
    } else {
      document.body.classList.remove('with-bg-image');
    }
    logger.info('Background preview applied', { 
      module: 'production-theme', 
      hasImage: !!image,
      opacity 
    });
  }

  private applyCurrentTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    // Use the enhanced applyThemeChanges function with complete mapping
    applyThemeChanges(currentColors);
    
    // Also update body classes for theme mode
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(this.state.mode);
  }

  private applyCurrentBackground(): void {
    applyBackgroundImage(this.state.backgroundImage, this.state.backgroundOpacity);
    
    // Ensure glass effect classes are properly applied
    if (this.state.backgroundImage) {
      document.body.classList.add('with-bg-image');
    } else {
      document.body.classList.remove('with-bg-image');
    }
  }

  async loadDefaultTheme(): Promise<boolean> {
    try {
      logger.info('Loading default theme from database', { module: 'production-theme' });
      
      const appSettings = await fetchAppSettings();
      
      if (appSettings.default_theme_settings) {
        const defaultSettings = JSON.parse(appSettings.default_theme_settings);
        
        if (this.validateThemeSettings(defaultSettings)) {
          this.state.lightTheme = defaultSettings.lightTheme || this.getDefaultLightTheme();
          this.state.darkTheme = defaultSettings.darkTheme || this.getDefaultDarkTheme();
          this.state.backgroundImage = defaultSettings.backgroundImage || null;
          this.state.backgroundOpacity = this.normalizeOpacity(defaultSettings.backgroundOpacity || 0.5);
          
          this.applyCurrentTheme();
          this.applyCurrentBackground();
          this.notifyListeners();
          
          logger.info('Default theme loaded from database', { module: 'production-theme' });
          return true;
        }
      }
      
      // Fallback to hardcoded defaults
      this.state.lightTheme = this.getDefaultLightTheme();
      this.state.darkTheme = this.getDefaultDarkTheme();
      this.state.backgroundImage = null;
      this.state.backgroundOpacity = 0.5;
      
      this.applyCurrentTheme();
      this.applyCurrentBackground();
      this.notifyListeners();
      
      logger.info('Loaded hardcoded default theme', { module: 'production-theme' });
      return false;
    } catch (error) {
      logger.error('Error loading default theme:', error);
      return false;
    }
  }

  createThemeSettings(): ThemeSettings {
    return {
      mode: this.state.mode,
      lightTheme: this.state.lightTheme,
      darkTheme: this.state.darkTheme,
      backgroundImage: this.state.backgroundImage,
      backgroundOpacity: this.state.backgroundOpacity,
      exportDate: new Date().toISOString(),
      name: 'Custom Theme'
    };
  }

  // Method to force refresh from fresh user data
  async refreshFromUserData(userSettings?: ThemeSettings): Promise<void> {
    await this.initialize(userSettings, true);
  }
}

export const productionThemeService = new ProductionThemeService();
