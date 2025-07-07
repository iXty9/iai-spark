import { ThemeColors, ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { SupaThemeState, StateListener } from './types';
import { getDefaultLightTheme, getDefaultDarkTheme } from './defaults';
import { ThemeApplier } from './theme-applier';
import { ThemePersistence } from './persistence';
import { PreviewManager } from './preview-manager';
import { RealtimeSync } from './realtime-sync';
import { AutoSave } from './auto-save';
import { ThemeLocalStorage } from './local-storage';

class SupaThemesCore {
  private state: SupaThemeState;
  private listeners: Set<StateListener> = new Set();
  private userId: string | null = null;

  // Service instances
  private themeApplier: ThemeApplier;
  private persistence: ThemePersistence;
  private previewManager: PreviewManager;
  private realtimeSync: RealtimeSync;
  private autoSave: AutoSave;

  constructor() {
    this.state = {
      mode: 'light',
      lightTheme: getDefaultLightTheme(),
      darkTheme: getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5,
      autoDimDarkMode: true,
      isReady: false,
      isInPreview: false,
      previewMode: null,
      previewLightTheme: null,
      previewDarkTheme: null,
      previewBackgroundImage: undefined,
      previewBackgroundOpacity: null,
      previewAutoDimDarkMode: null,
      hasUnsavedChanges: false
    };

    // Initialize services
    this.themeApplier = new ThemeApplier();
    this.persistence = new ThemePersistence();
    this.previewManager = new PreviewManager(this.themeApplier);
    this.realtimeSync = new RealtimeSync(this.persistence, this.themeApplier);
    this.autoSave = new AutoSave(this.persistence);
  }

  // Core initialization
  async initialize(userId?: string): Promise<void> {
    // Early theme application for better performance - apply from localStorage immediately
    if (!userId) {
      this.loadAnonymousTheme();
    }
    
    if (userId && userId !== this.userId) {
      this.userId = userId;
      await this.persistence.loadUserTheme(userId, this.state);
      this.realtimeSync.setupRealtimeSync(userId, this.state, this.notifyListeners.bind(this));
    } else if (!userId) {
      // Load admin defaults for unauthenticated users (already applied early above)
      await this.loadAdminDefaults();
    }
    
    this.state.isReady = true;
    // Batch theme and background application for better performance
    this.themeApplier.applyBatched(this.state);
    this.notifyListeners();
    
    logger.info('SupaThemes initialized', { module: 'supa-themes', userId: this.userId });
  }

  // Load anonymous user theme from localStorage
  private loadAnonymousTheme(): void {
    const localTheme = ThemeLocalStorage.loadTheme();
    if (localTheme) {
      this.state.mode = localTheme.mode || 'light';
      this.state.lightTheme = localTheme.lightTheme || getDefaultLightTheme();
      this.state.darkTheme = localTheme.darkTheme || getDefaultDarkTheme();
      this.state.backgroundImage = localTheme.backgroundImage || null;
      this.state.backgroundOpacity = localTheme.backgroundOpacity ?? 0.5;
      this.state.autoDimDarkMode = localTheme.autoDimDarkMode ?? true;
      
      // Apply theme immediately for better performance
      this.themeApplier.applyBatched(this.state);
      
      logger.info('Anonymous theme loaded from localStorage', { module: 'supa-themes' });
    } else {
      // Use defaults and save them for future visits
      const defaultSettings = ThemeLocalStorage.getDefaultSettings();
      this.state.mode = defaultSettings.mode || 'light';
      this.state.lightTheme = defaultSettings.lightTheme || getDefaultLightTheme();
      this.state.darkTheme = defaultSettings.darkTheme || getDefaultDarkTheme();
      this.state.backgroundImage = defaultSettings.backgroundImage || null;
      this.state.backgroundOpacity = defaultSettings.backgroundOpacity ?? 0.5;
      this.state.autoDimDarkMode = defaultSettings.autoDimDarkMode ?? true;
      
      // Save defaults for next visit
      this.saveAnonymousTheme();
      
      // Apply theme immediately
      this.themeApplier.applyBatched(this.state);
      
      logger.info('Default theme applied and saved for anonymous user', { module: 'supa-themes' });
    }
  }

  // Load admin defaults (for unauthenticated users)
  private async loadAdminDefaults(): Promise<void> {
    try {
      const adminDefaults = await this.persistence.loadAdminDefaultTheme();
      
      if (adminDefaults) {
        // Merge admin defaults with existing anonymous settings (don't override user prefs)
        if (!ThemeLocalStorage.loadTheme()) {
          this.state.mode = adminDefaults.mode || this.state.mode;
          this.state.lightTheme = adminDefaults.lightTheme || this.state.lightTheme;
          this.state.darkTheme = adminDefaults.darkTheme || this.state.darkTheme;
          this.state.backgroundImage = adminDefaults.backgroundImage ?? this.state.backgroundImage;
          this.state.backgroundOpacity = adminDefaults.backgroundOpacity ?? this.state.backgroundOpacity;
          this.state.autoDimDarkMode = adminDefaults.autoDimDarkMode ?? this.state.autoDimDarkMode;
          
          // Save the merged settings
          this.saveAnonymousTheme();
        }
        
        logger.info('Admin defaults merged for anonymous user', { module: 'supa-themes' });
      } else {
        logger.info('No admin defaults found, keeping anonymous settings', { module: 'supa-themes' });
      }
    } catch (error) {
      logger.warn('Failed to load admin defaults:', error);
    }
  }

  // Save anonymous theme to localStorage - moved before usage
  private saveAnonymousTheme = (): void => {
    if (this.userId) return; // Only for anonymous users
    
    try {
      const themeSettings: ThemeSettings = {
        mode: this.state.mode,
        lightTheme: this.state.lightTheme,
        darkTheme: this.state.darkTheme,
        backgroundImage: this.state.backgroundImage,
        backgroundOpacity: this.state.backgroundOpacity,
        autoDimDarkMode: this.state.autoDimDarkMode,
        name: 'Anonymous Theme',
        exportDate: new Date().toISOString()
      };
      
      ThemeLocalStorage.saveTheme(themeSettings);
      logger.info('Anonymous theme saved to localStorage', { module: 'supa-themes' });
    } catch (error) {
      logger.error('Failed to save anonymous theme:', error, { module: 'supa-themes' });
    }
  }

  // State management
  getState(): SupaThemeState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Public API - Theme mode
  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.themeApplier.applyCurrentTheme(this.state);
    this.notifyListeners();
    
    // Auto-save with debouncing (for authenticated users) or localStorage (for anonymous)
    if (!this.state.isInPreview) {
      if (this.userId) {
        this.autoSave.scheduleAutoSave(this.userId, this.saveTheme.bind(this));
      } else {
        this.saveAnonymousTheme();
      }
    }
  }

  // Public API - Theme colors
  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light' && !this.state.isInPreview) {
      this.themeApplier.applyCurrentTheme(this.state);
    }
    this.notifyListeners();
    
    // Auto-save for anonymous users
    if (!this.userId && !this.state.isInPreview) {
      this.saveAnonymousTheme();
    }
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark' && !this.state.isInPreview) {
      this.themeApplier.applyCurrentTheme(this.state);
    }
    this.notifyListeners();
    
    // Auto-save for anonymous users
    if (!this.userId && !this.state.isInPreview) {
      this.saveAnonymousTheme();
    }
  }

  // Public API - Background
  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
    
    // Auto-save for anonymous users
    if (!this.userId && !this.state.isInPreview) {
      this.saveAnonymousTheme();
    }
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = Math.max(0, Math.min(1, opacity));
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
    
    // Auto-save for anonymous users
    if (!this.userId && !this.state.isInPreview) {
      this.saveAnonymousTheme();
    }
  }

  setAutoDimDarkMode(enabled: boolean): void {
    this.state.autoDimDarkMode = enabled;
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
    
    // Auto-save for anonymous users
    if (!this.userId && !this.state.isInPreview) {
      this.saveAnonymousTheme();
    }
  }

  // Preview mode operations
  enterPreviewMode(): void {
    this.previewManager.enterPreviewMode(this.state);
    this.notifyListeners();
  }

  exitPreviewMode(save: boolean = false): void {
    this.previewManager.exitPreviewMode(this.state, save);
    this.notifyListeners();
  }

  previewMode(mode: 'light' | 'dark'): void {
    this.previewManager.previewMode(this.state, mode);
    this.notifyListeners();
  }

  previewLightTheme(theme: ThemeColors): void {
    this.previewManager.previewLightTheme(this.state, theme);
    this.notifyListeners();
  }

  previewDarkTheme(theme: ThemeColors): void {
    this.previewManager.previewDarkTheme(this.state, theme);
    this.notifyListeners();
  }

  previewBackgroundImage(image: string | null): void {
    this.previewManager.previewBackgroundImage(this.state, image);
    this.notifyListeners();
  }

  previewBackgroundOpacity(opacity: number): void {
    this.previewManager.previewBackgroundOpacity(this.state, opacity);
    this.notifyListeners();
  }

  previewAutoDimDarkMode(enabled: boolean): void {
    this.previewManager.previewAutoDimDarkMode(this.state, enabled);
    this.notifyListeners();
  }

  // Save to Supabase
  async saveTheme(): Promise<boolean> {
    if (!this.userId) {
      logger.warn('Cannot save theme: no user ID');
      return false;
    }

    try {
      // Commit preview changes to main state
      if (this.state.isInPreview) {
        this.previewManager.commitPreviewChanges(this.state);
      }

      const success = await this.persistence.saveTheme(this.userId, this.state);
      
      if (success) {
        // Exit preview mode after successful save
        this.exitPreviewMode(true);
      }
      
      return success;
    } catch (error) {
      logger.error('Error saving theme:', error);
      return false;
    }
  }

  // Reset to defaults
  async resetToDefaults(): Promise<boolean> {
    try {
      // Load admin default theme settings first
      const adminDefaults = await this.persistence.loadAdminDefaultTheme();
      
      if (adminDefaults) {
        // Apply admin defaults
        this.state.mode = adminDefaults.mode || 'light';
        this.state.lightTheme = adminDefaults.lightTheme || getDefaultLightTheme();
        this.state.darkTheme = adminDefaults.darkTheme || getDefaultDarkTheme();
        this.state.backgroundImage = adminDefaults.backgroundImage || null;
        this.state.backgroundOpacity = adminDefaults.backgroundOpacity ?? 0.5;
        this.state.autoDimDarkMode = adminDefaults.autoDimDarkMode ?? true;
      } else {
        // Fallback to hardcoded defaults if no admin defaults
        this.state.mode = 'light';
        this.state.lightTheme = getDefaultLightTheme();
        this.state.darkTheme = getDefaultDarkTheme();
        this.state.backgroundImage = null;
        this.state.backgroundOpacity = 0.5;
        this.state.autoDimDarkMode = true;
      }

      this.themeApplier.applyBatched(this.state);
      this.notifyListeners();

      // Automatically save - use localStorage for anonymous users
      if (this.userId) {
        return await this.saveTheme();
      } else {
        this.saveAnonymousTheme();
        return true;
      }
    } catch (error) {
      logger.error('Error resetting theme:', error);
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    this.autoSave.cleanup();
    this.realtimeSync.cleanup();
    this.listeners.clear();
    this.userId = null;
  }
}

// Export singleton instance
export const supaThemes = new SupaThemesCore();