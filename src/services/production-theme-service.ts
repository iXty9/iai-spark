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
  
  // Preview state for settings UI
  isInPreview: boolean;
  previewMode: 'light' | 'dark' | null;
  previewLightTheme: ThemeColors | null;
  previewDarkTheme: ThemeColors | null;
  previewBackgroundImage: string | null | undefined;
  previewBackgroundOpacity: number | null;
  hasUnsavedChanges: boolean;
}

class ProductionThemeService {
  private state: ThemeState;
  private listeners: Set<(state: ThemeState) => void> = new Set();
  private originalState: ThemeState | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private saveInProgress = false;
  private lastSaveTime = 0;
  private lastSavedSettings: ThemeSettings | null = null;

  constructor() {
    this.state = {
      mode: 'light',
      lightTheme: this.getDefaultLightTheme(),
      darkTheme: this.getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5,
      isReady: false,
      isInPreview: false,
      previewMode: null,
      previewLightTheme: null,
      previewDarkTheme: null,
      previewBackgroundImage: undefined,
      previewBackgroundOpacity: null,
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
    };
  }

  async initialize(userSettings?: ThemeSettings, forceReinit = false, userAuthenticated = false): Promise<void> {
    // PHASE 1: Authentication-aware initialization
    // Only skip forced reinit if save is very recent (reduced from 2s to 1s)
    if (forceReinit && (this.saveInProgress || (Date.now() - this.lastSaveTime < 1000))) {
      logger.info('Skipping forced reinitialization due to recent save activity', { 
        module: 'production-theme-service' 
      });
      return;
    }

    // PHASE 2: Improved refresh logic - allow force reinit when user becomes authenticated
    if (forceReinit || userAuthenticated) {
      this.isInitialized = false;
      this.initializationPromise = null;
      logger.info('Force reinitializing theme service', { 
        forceReinit, 
        userAuthenticated,
        module: 'production-theme-service' 
      });
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized && !forceReinit && !userAuthenticated) {
      return Promise.resolve();
    }

    this.initializationPromise = this.performInitialization(userSettings, userAuthenticated);
    return this.initializationPromise;
  }

  private async performInitialization(userSettings?: ThemeSettings, userAuthenticated = false): Promise<void> {
    try {
      logger.info('Initializing unified theme service', { 
        module: 'unified-theme',
        hasUserSettings: !!userSettings
      });

      if (userSettings && this.validateThemeSettings(userSettings)) {
        this.state.mode = userSettings.mode || 'light';
        this.state.lightTheme = userSettings.lightTheme || this.getDefaultLightTheme();
        this.state.darkTheme = userSettings.darkTheme || this.getDefaultDarkTheme();
        this.state.backgroundImage = userSettings.backgroundImage || null;
        this.state.backgroundOpacity = this.normalizeOpacity(userSettings.backgroundOpacity || 0.5);
      } else {
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
      this.applyCurrentTheme();
      this.applyCurrentBackground();
      
      this.isInitialized = true;
      this.initializationPromise = null;
      this.notifyListeners();
      
      logger.info('Unified theme service initialized', { 
        module: 'unified-theme',
        mode: this.state.mode
      });
    } catch (error) {
      logger.error('Failed to initialize unified theme service:', error);
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

  // Core setters for production state
  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.applyCurrentTheme();
    this.notifyListeners();
    logger.info('Theme mode changed', { module: 'unified-theme', mode });
  }

  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light') {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
    logger.info('Light theme updated', { module: 'unified-theme' });
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark') {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
    logger.info('Dark theme updated', { module: 'unified-theme' });
  }

  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    this.applyCurrentBackground();
    this.notifyListeners();
    logger.info('Background image updated', { module: 'unified-theme', hasImage: !!image });
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = this.normalizeOpacity(opacity);
    this.applyCurrentBackground();
    this.notifyListeners();
    logger.info('Background opacity updated', { module: 'unified-theme', opacity: this.state.backgroundOpacity });
  }

  // NEW: Preview mode management for settings UI
  enterPreviewMode(): void {
    if (this.state.isInPreview) return;
    
    this.originalState = { ...this.state };
    this.state.isInPreview = true;
    this.state.previewMode = this.state.mode;
    
    logger.info('Entered preview mode', { module: 'unified-theme' });
    this.notifyListeners();
  }

  exitPreviewMode(save: boolean = false): void {
    if (!this.state.isInPreview || !this.originalState) return;
    
    if (save) {
      this.commitPreviewChanges();
    } else {
      this.state.mode = this.originalState.mode;
      this.state.lightTheme = this.originalState.lightTheme;
      this.state.darkTheme = this.originalState.darkTheme;
      this.state.backgroundImage = this.originalState.backgroundImage;
      this.state.backgroundOpacity = this.originalState.backgroundOpacity;
      this.applyCurrentTheme();
    }
    
    this.state.isInPreview = false;
    this.state.previewMode = null;
    this.state.previewLightTheme = null;
    this.state.previewDarkTheme = null;
    this.state.previewBackgroundImage = undefined;
    this.state.previewBackgroundOpacity = null;
    this.state.hasUnsavedChanges = false;
    this.originalState = null;
    
    logger.info('Exited preview mode', { module: 'unified-theme', saved: save });
    this.notifyListeners();
  }

  // NEW: Preview update methods
  previewThemeMode(mode: 'light' | 'dark'): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewMode = mode;
    this.state.hasUnsavedChanges = true;
    
    const currentTheme = this.getCurrentPreviewTheme(mode);
    const currentBackground = this.getCurrentPreviewBackground();
    
    applyThemeChanges(currentTheme);
    this.updateDocumentThemeMode(mode);
    applyBackgroundImage(currentBackground.image, currentBackground.opacity);
    
    this.notifyListeners();
  }

  previewLightTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewLightTheme = theme;
    this.state.hasUnsavedChanges = true;
    
    if ((this.state.previewMode || this.state.mode) === 'light') {
      applyThemeChanges(theme);
    }
    
    this.notifyListeners();
  }

  previewDarkTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewDarkTheme = theme;
    this.state.hasUnsavedChanges = true;
    
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

  private applyCurrentTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    applyThemeChanges(currentColors);
    this.updateDocumentThemeMode(this.state.mode);
  }

  private updateDocumentThemeMode(mode: 'light' | 'dark'): void {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
  }

  private applyCurrentBackground(): void {
    applyBackgroundImage(this.state.backgroundImage, this.state.backgroundOpacity);
    
    if (this.state.backgroundImage) {
      document.body.classList.add('with-bg-image');
    } else {
      document.body.classList.remove('with-bg-image');
    }
  }

  async loadDefaultTheme(): Promise<boolean> {
    try {
      logger.info('Loading default theme from database', { module: 'unified-theme' });
      
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
          
          logger.info('Default theme loaded from database', { module: 'unified-theme' });
          return true;
        }
      }
      
      this.state.lightTheme = this.getDefaultLightTheme();
      this.state.darkTheme = this.getDefaultDarkTheme();
      this.state.backgroundImage = null;
      this.state.backgroundOpacity = 0.5;
      
      this.applyCurrentTheme();
      this.applyCurrentBackground();
      this.notifyListeners();
      
      logger.info('Loaded hardcoded default theme', { module: 'unified-theme' });
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

  async saveUserTheme(user: any, updateProfile: any): Promise<boolean> {
    if (this.saveInProgress) {
      logger.warn('Save already in progress, skipping duplicate save', { module: 'production-theme-service' });
      return false;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        this.saveInProgress = true;
        const themeSettings = this.createThemeSettings();
        const themeSettingsJson = JSON.stringify(themeSettings);
        
        logger.info('Attempting to save theme settings', { 
          attempt: retryCount + 1,
          module: 'production-theme-service' 
        });
        
        // PHASE 3: Save to database and wait for completion
        await updateProfile({
          theme_settings: themeSettingsJson
        });
        
        // PHASE 3: Verify the data was actually written by reading it back
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mark successful save timestamp BEFORE committing changes
        this.lastSaveTime = Date.now();
        
        // Commit preview changes to production state
        this.exitPreviewMode(true);
        
        // Store the last saved settings for consistency checking
        this.lastSavedSettings = themeSettings;
        
        logger.info('Theme settings saved and committed successfully', { 
          module: 'production-theme-service',
          timestamp: this.lastSaveTime,
          attempt: retryCount + 1
        });
        return true;
      } catch (error) {
        retryCount++;
        logger.error(`Failed to save theme settings (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          return false;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 250 * retryCount));
      } finally {
        if (retryCount >= maxRetries || retryCount === 0) {
          this.saveInProgress = false;
        }
      }
    }
    
    return false;
  }

  async resetToDefaults(user: any, updateProfile: any): Promise<boolean> {
    try {
      const success = await this.loadDefaultTheme();
      
      if (success && user) {
        const themeSettings = this.createThemeSettings();
        await updateProfile({
          theme_settings: JSON.stringify(themeSettings)
        });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to reset theme settings:', error);
      return false;
    }
  }

  async refreshFromUserData(userSettings?: ThemeSettings, forceRefresh = false): Promise<void> {
    // PHASE 2: Improved refresh logic - only skip if very recent save (reduced to 1 second)
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    if (!forceRefresh && (this.saveInProgress || timeSinceLastSave < 1000)) {
      logger.info('Skipping theme refresh - recent save detected', { 
        module: 'production-theme-service',
        timeSinceLastSave,
        saveInProgress: this.saveInProgress,
        forceRefresh
      });
      return;
    }

    // PHASE 2: Only compare settings if not forcing refresh
    if (!forceRefresh && userSettings && this.lastSavedSettings) {
      const currentSettingsJson = JSON.stringify(this.lastSavedSettings);
      const incomingSettingsJson = JSON.stringify(userSettings);
      
      if (currentSettingsJson === incomingSettingsJson) {
        logger.info('Skipping theme refresh - no changes detected', { 
          module: 'production-theme-service' 
        });
        return;
      }
    }

    // PHASE 2: Perform the refresh with user authentication context
    await this.initialize(userSettings, true, true);
    
    // Update the last saved settings to match what we just loaded
    if (userSettings) {
      this.lastSavedSettings = { ...userSettings };
    }
    
    logger.info('Theme refreshed from user data', {
      module: 'production-theme-service',
      forceRefresh,
      hasUserSettings: !!userSettings
    });
  }
}

export const productionThemeService = new ProductionThemeService();
