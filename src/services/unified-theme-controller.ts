
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { themeService } from '@/services/theme-service';
import { logger } from '@/utils/logging';

export interface ThemeState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

class UnifiedThemeController {
  private state: ThemeState;
  private listeners: Set<(state: ThemeState) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.state = {
      mode: 'light',
      lightTheme: this.getDefaultLightTheme(),
      darkTheme: this.getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5
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

  async initialize(userSettings?: ThemeSettings): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize theme service first
      await themeService.initialize();

      if (userSettings && this.validateThemeSettings(userSettings)) {
        this.state = {
          mode: userSettings.mode || 'light',
          lightTheme: userSettings.lightTheme || this.getDefaultLightTheme(),
          darkTheme: userSettings.darkTheme || this.getDefaultDarkTheme(),
          backgroundImage: userSettings.backgroundImage || null,
          backgroundOpacity: this.normalizeOpacity(userSettings.backgroundOpacity || 0.5)
        };
        
        logger.info('Initialized with user settings', { 
          module: 'theme-controller',
          backgroundImage: !!this.state.backgroundImage,
          backgroundOpacity: this.state.backgroundOpacity
        });
      }

      // CRITICAL FIX: Apply both theme and background immediately after initialization
      this.applyCurrentTheme();
      this.applyBackground();
      
      this.isInitialized = true;
      logger.info('Unified theme controller initialized and applied', { 
        module: 'theme-controller',
        backgroundImage: !!this.state.backgroundImage,
        backgroundOpacity: this.state.backgroundOpacity
      });
    } catch (error) {
      logger.error('Failed to initialize theme controller:', error);
      this.isInitialized = true; // Prevent infinite retries
    }
  }

  private validateThemeSettings(settings: ThemeSettings): boolean {
    // Basic validation - could be expanded
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

  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.applyCurrentTheme();
    this.notifyListeners();
    logger.info('Theme mode changed', { module: 'theme-controller', mode });
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
    this.applyBackground();
    this.notifyListeners();
    logger.info('Background image changed', { module: 'theme-controller', hasImage: !!image });
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = this.normalizeOpacity(opacity);
    this.applyBackground();
    this.notifyListeners();
    logger.info('Background opacity changed', { module: 'theme-controller', opacity: this.state.backgroundOpacity });
  }

  updateState(updates: Partial<ThemeState>): void {
    let changed = false;

    if (updates.mode && updates.mode !== this.state.mode) {
      this.state.mode = updates.mode;
      changed = true;
    }

    if (updates.lightTheme) {
      this.state.lightTheme = updates.lightTheme;
      changed = true;
    }

    if (updates.darkTheme) {
      this.state.darkTheme = updates.darkTheme;
      changed = true;
    }

    if (updates.backgroundImage !== undefined) {
      this.state.backgroundImage = updates.backgroundImage;
      changed = true;
    }

    if (updates.backgroundOpacity !== undefined) {
      this.state.backgroundOpacity = this.normalizeOpacity(updates.backgroundOpacity);
      changed = true;
    }

    if (changed) {
      this.applyCurrentTheme();
      this.applyBackground();
      this.notifyListeners();
    }
  }

  private applyCurrentTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    themeService.applyThemeImmediate(currentColors, this.state.mode);
  }

  private applyBackground(): void {
    // ENHANCED: Always apply background, even if null, to ensure proper cleanup
    themeService.applyBackground(this.state.backgroundImage, this.state.backgroundOpacity);
    logger.info('Applied background through theme service', { 
      module: 'theme-controller',
      hasImage: !!this.state.backgroundImage,
      opacity: this.state.backgroundOpacity
    });
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

  get initialized(): boolean {
    return this.isInitialized;
  }
}

export const unifiedThemeController = new UnifiedThemeController();
