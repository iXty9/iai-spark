
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
      lightTheme: themeService.getDefaultThemeColors('light'),
      darkTheme: themeService.getDefaultThemeColors('dark'),
      backgroundImage: null,
      backgroundOpacity: 0.5
    };
  }

  async initialize(userSettings?: ThemeSettings): Promise<void> {
    if (this.isInitialized) return;

    try {
      await themeService.initialize();

      if (userSettings && themeService.validateThemeSettings(userSettings)) {
        this.state = {
          mode: userSettings.mode || 'light',
          lightTheme: userSettings.lightTheme || themeService.getDefaultThemeColors('light'),
          darkTheme: userSettings.darkTheme || themeService.getDefaultThemeColors('dark'),
          backgroundImage: userSettings.backgroundImage || null,
          backgroundOpacity: this.normalizeOpacity(userSettings.backgroundOpacity || 0.5)
        };
      }

      this.applyCurrentTheme();
      this.isInitialized = true;
      logger.info('Unified theme controller initialized', { module: 'theme-controller' });
    } catch (error) {
      logger.error('Failed to initialize theme controller:', error);
      this.isInitialized = true; // Prevent infinite retries
    }
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
    themeService.applyBackground(this.state.backgroundImage, this.state.backgroundOpacity);
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
