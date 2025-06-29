
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';

export interface CentralizedThemeState {
  // Current active theme
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  
  // Preview state (temporary changes for settings UI)
  previewMode: 'light' | 'dark' | null;
  previewLightTheme: ThemeColors | null;
  previewDarkTheme: ThemeColors | null;
  previewBackgroundImage: string | null | undefined;
  previewBackgroundOpacity: number | null;
  
  // System state
  isReady: boolean;
  isInPreview: boolean;
  hasUnsavedChanges: boolean;
}

class CentralizedThemeService {
  private state: CentralizedThemeState;
  private listeners: Set<(state: CentralizedThemeState) => void> = new Set();
  private originalState: CentralizedThemeState | null = null;
  private isInitialized = false;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): CentralizedThemeState {
    return {
      mode: 'light',
      lightTheme: this.getDefaultLightTheme(),
      darkTheme: this.getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5,
      previewMode: null,
      previewLightTheme: null,
      previewDarkTheme: null,
      previewBackgroundImage: undefined,
      previewBackgroundOpacity: null,
      isReady: false,
      isInPreview: false,
      hasUnsavedChanges: false
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
      aiTextColor: '#000000',
      userNameColor: '#666666',
      aiNameColor: '#666666'
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
      aiTextColor: '#ffffff',
      userNameColor: '#cccccc',
      aiNameColor: '#cccccc'
    };
  }

  async initialize(userSettings?: ThemeSettings): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing centralized theme service', { 
        module: 'centralized-theme',
        hasUserSettings: !!userSettings
      });

      if (userSettings && this.validateThemeSettings(userSettings)) {
        this.state.mode = userSettings.mode || 'light';
        this.state.lightTheme = userSettings.lightTheme || this.getDefaultLightTheme();
        this.state.darkTheme = userSettings.darkTheme || this.getDefaultDarkTheme();
        this.state.backgroundImage = userSettings.backgroundImage || null;
        this.state.backgroundOpacity = this.normalizeOpacity(userSettings.backgroundOpacity || 0.5);
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
            }
          }
        } catch (error) {
          logger.warn('Could not load default theme from database, using hardcoded defaults', error);
        }
      }

      this.state.isReady = true;
      this.isInitialized = true;
      
      // Apply theme immediately
      this.applyCurrentTheme();
      this.notifyListeners();
      
      logger.info('Centralized theme service initialized', { 
        module: 'centralized-theme',
        mode: this.state.mode
      });
    } catch (error) {
      logger.error('Failed to initialize centralized theme service:', error);
      this.state.isReady = true;
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  // State access
  getState(): CentralizedThemeState {
    return { ...this.state };
  }

  subscribe(listener: (state: CentralizedThemeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Preview mode management
  enterPreviewMode(): void {
    if (this.state.isInPreview) return;
    
    // Store original state for restoration
    this.originalState = { ...this.state };
    this.state.isInPreview = true;
    this.state.previewMode = this.state.mode;
    
    logger.info('Entered preview mode', { module: 'centralized-theme' });
    this.notifyListeners();
  }

  exitPreviewMode(save: boolean = false): void {
    if (!this.state.isInPreview || !this.originalState) return;
    
    if (save) {
      // Apply preview changes to actual state
      this.commitPreviewChanges();
    } else {
      // Restore original state
      this.state.mode = this.originalState.mode;
      this.state.lightTheme = this.originalState.lightTheme;
      this.state.darkTheme = this.originalState.darkTheme;
      this.state.backgroundImage = this.originalState.backgroundImage;
      this.state.backgroundOpacity = this.originalState.backgroundOpacity;
      
      // Apply original theme
      this.applyCurrentTheme();
    }
    
    // Clear preview state
    this.state.isInPreview = false;
    this.state.previewMode = null;
    this.state.previewLightTheme = null;
    this.state.previewDarkTheme = null;
    this.state.previewBackgroundImage = undefined;
    this.state.previewBackgroundOpacity = null;
    this.state.hasUnsavedChanges = false;
    this.originalState = null;
    
    logger.info('Exited preview mode', { module: 'centralized-theme', saved: save });
    this.notifyListeners();
  }

  // Preview updates (don't affect actual state)
  previewThemeMode(mode: 'light' | 'dark'): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewMode = mode;
    
    // Apply preview theme immediately
    const currentTheme = this.getCurrentPreviewTheme(mode);
    const currentBackground = this.getCurrentPreviewBackground();
    
    applyThemeChanges(currentTheme);
    this.updateDocumentThemeMode(mode);
    applyBackgroundImage(currentBackground.image, currentBackground.opacity);
    
    logger.info('Preview mode updated', { module: 'centralized-theme', mode });
    this.notifyListeners();
  }

  previewLightTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewLightTheme = theme;
    this.state.hasUnsavedChanges = true;
    
    // Apply immediately if currently in light mode
    if ((this.state.previewMode || this.state.mode) === 'light') {
      applyThemeChanges(theme);
    }
    
    this.notifyListeners();
  }

  previewDarkTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewDarkTheme = theme;
    this.state.hasUnsavedChanges = true;
    
    // Apply immediately if currently in dark mode
    if ((this.state.previewMode || this.state.mode) === 'dark') {
      applyThemeChanges(theme);
    }
    
    this.notifyListeners();
  }

  previewBackgroundImage(image: string | null): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewBackgroundImage = image;
    this.state.hasUnsavedChanges = true;
    
    const opacity = this.state.previewBackgroundOpacity ?? this.state.backgroundOpacity;
    applyBackgroundImage(image, opacity);
    
    this.notifyListeners();
  }

  previewBackgroundOpacity(opacity: number): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewBackgroundOpacity = opacity;
    this.state.hasUnsavedChanges = true;
    
    const image = this.state.previewBackgroundImage !== undefined 
      ? this.state.previewBackgroundImage 
      : this.state.backgroundImage;
    applyBackgroundImage(image, opacity);
    
    this.notifyListeners();
  }

  // Actual state updates (for saving)
  private commitPreviewChanges(): void {
    if (this.state.previewMode !== null) {
      this.state.mode = this.state.previewMode;
    }
    if (this.state.previewLightTheme) {
      this.state.lightTheme = this.state.previewLightTheme;
    }
    if (this.state.previewDarkTheme) {
      this.state.darkTheme = this.state.previewDarkTheme;
    }
    if (this.state.previewBackgroundImage !== undefined) {
      this.state.backgroundImage = this.state.previewBackgroundImage;
    }
    if (this.state.previewBackgroundOpacity !== null) {
      this.state.backgroundOpacity = this.state.previewBackgroundOpacity;
    }
  }

  // Helper methods
  private getCurrentPreviewTheme(mode?: 'light' | 'dark'): ThemeColors {
    const currentMode = mode || this.state.previewMode || this.state.mode;
    
    if (currentMode === 'light') {
      return this.state.previewLightTheme || this.state.lightTheme;
    } else {
      return this.state.previewDarkTheme || this.state.darkTheme;
    }
  }

  private getCurrentPreviewBackground(): { image: string | null; opacity: number } {
    return {
      image: this.state.previewBackgroundImage !== undefined 
        ? this.state.previewBackgroundImage 
        : this.state.backgroundImage,
      opacity: this.state.previewBackgroundOpacity ?? this.state.backgroundOpacity
    };
  }

  private applyCurrentTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    applyThemeChanges(currentColors);
    this.updateDocumentThemeMode(this.state.mode);
    applyBackgroundImage(this.state.backgroundImage, this.state.backgroundOpacity);
  }

  private updateDocumentThemeMode(mode: 'light' | 'dark'): void {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
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

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Public API for saving changes
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

  async loadDefaultTheme(): Promise<boolean> {
    try {
      const appSettings = await fetchAppSettings();
      
      if (appSettings.default_theme_settings) {
        const defaultSettings = JSON.parse(appSettings.default_theme_settings);
        
        if (this.validateThemeSettings(defaultSettings)) {
          this.state.lightTheme = defaultSettings.lightTheme || this.getDefaultLightTheme();
          this.state.darkTheme = defaultSettings.darkTheme || this.getDefaultDarkTheme();
          this.state.backgroundImage = defaultSettings.backgroundImage || null;
          this.state.backgroundOpacity = this.normalizeOpacity(defaultSettings.backgroundOpacity || 0.5);
          
          this.applyCurrentTheme();
          this.notifyListeners();
          
          return true;
        }
      }
      
      // Fallback to hardcoded defaults
      this.state.lightTheme = this.getDefaultLightTheme();
      this.state.darkTheme = this.getDefaultDarkTheme();
      this.state.backgroundImage = null;
      this.state.backgroundOpacity = 0.5;
      
      this.applyCurrentTheme();
      this.notifyListeners();
      
      return false;
    } catch (error) {
      logger.error('Error loading default theme:', error);
      return false;
    }
  }
}

export const centralizedThemeService = new CentralizedThemeService();
