import { ThemeColors, ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { SupaThemeState, StateListener } from './types';
import { getDefaultLightTheme, getDefaultDarkTheme } from './defaults';
import { ThemeApplier, applyImmediateDocumentTheme } from './theme-applier';
import { ThemePersistence } from './persistence';
import { PreviewManager } from './preview-manager';
import { RealtimeSync } from './realtime-sync';
import { AutoSave } from './auto-save';

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
    const nextUserId = userId ?? null;
    
    // Make initialization idempotent - no-op if same user context
    if (this.state.isReady && this.userId === nextUserId) {
      logger.info('SupaThemes.initialize: no-op (same context)', { 
        module: 'supa-themes', 
        userId: nextUserId ?? 'anonymous' 
      });
      return;
    }
    
    // Apply immediate theme only if explicit preference exists
    this.applyImmediateTheme();
    
    // For anonymous users, skip the delay to prevent theme conflicts
    if (userId) {
      // Only wait for authenticated users to avoid PWA update conflicts
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (userId && userId !== this.userId) {
      this.userId = userId;
      await this.persistence.loadUserTheme(userId, this.state);
      this.realtimeSync.setupRealtimeSync(userId, this.state, this.notifyListeners.bind(this));
      
      // For authenticated users, prioritize database settings over localStorage
      this.syncLocalStorageWithUser();
    } else if (!userId) {
      // Load admin defaults for unauthenticated users
      await this.loadAdminDefaults();
      
      // For anonymous users, use localStorage preference but NOT OS preference on app load
      const preferred = this.getPreferredInitialMode();
      if (preferred) {
        this.state.mode = preferred;
      }
    }
    
    this.state.isReady = true;
    this.themeApplier.applyCurrentTheme(this.state);
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
    
    logger.info('SupaThemes initialized', { module: 'supa-themes', userId: this.userId });
  }

  // Load admin defaults (for unauthenticated users)
  private async loadAdminDefaults(): Promise<void> {
    try {
      const adminDefaults = await this.persistence.loadAdminDefaultTheme();
      
      if (adminDefaults) {
        // Apply admin defaults
        this.state.mode = adminDefaults.mode || 'light';
        this.state.lightTheme = adminDefaults.lightTheme || getDefaultLightTheme();
        this.state.darkTheme = adminDefaults.darkTheme || getDefaultDarkTheme();
        this.state.backgroundImage = adminDefaults.backgroundImage || null;
        this.state.backgroundOpacity = adminDefaults.backgroundOpacity ?? 0.5;
        this.state.autoDimDarkMode = adminDefaults.autoDimDarkMode ?? true;
        
        logger.info('Admin default theme loaded for unauthenticated user', { module: 'supa-themes' });
      } else {
        logger.info('No admin defaults found, using hardcoded defaults', { module: 'supa-themes' });
      }
    } catch (error) {
      logger.warn('Failed to load admin defaults, using hardcoded defaults:', error);
    }
  }

  // Apply immediate theme on initialization to prevent flash
  private applyImmediateTheme(): void {
    if (typeof window === 'undefined') return;
    
    // Only apply immediate theme if there's an explicit localStorage preference
    const explicitPref = this.getLocalStoragePreference();
    
    if (explicitPref) {
      logger.info('Applying immediate theme from localStorage', { 
        module: 'supa-themes', 
        mode: explicitPref 
      });
      applyImmediateDocumentTheme(explicitPref);
    } else {
      // No explicit preference - let base CSS render (defaults to light)
      // and apply final mode once defaults are loaded
      logger.info('No explicit theme preference, skipping immediate theme application', { 
        module: 'supa-themes' 
      });
    }
  }

  private getSavedUserMode(): 'light' | 'dark' | null {
    // This would need to be synchronous, so we'll check if theme state was loaded
    return this.state.mode !== 'light' ? this.state.mode : null;
  }

  private getLocalStoragePreference(): 'light' | 'dark' | null {
    try {
      if (typeof window === 'undefined') return null;
      const pref = localStorage.getItem('theme_mode_pref') as 'light' | 'dark' | 'system' | null;
      
      // For anonymous users, only return explicit light/dark values
      // Never auto-resolve "system" preference during initialization
      if (pref === 'light' || pref === 'dark') return pref;
      
      // "system" preference should not be auto-resolved on app load
      // This ensures fresh anonymous users always start in light mode
    } catch (e) {}
    return null; // Default to light mode if no explicit preference
  }

  private getPreferredInitialMode(): 'light' | 'dark' | null {
    // For anonymous users only
    return this.getLocalStoragePreference();
  }

  private setDocumentMode(mode: 'light' | 'dark'): void {
    applyImmediateDocumentTheme(mode);
  }

  // Sync localStorage with authenticated user's database settings
  private syncLocalStorageWithUser(): void {
    if (typeof window === 'undefined' || !this.userId) return;
    
    try {
      // Update localStorage to match user's database preference
      localStorage.setItem('theme_mode_pref', this.state.mode);
      logger.info('Synchronized localStorage with user database settings', { 
        module: 'supa-themes', 
        mode: this.state.mode 
      });
    } catch (error) {
      logger.warn('Failed to sync localStorage with user settings:', error);
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
    applyImmediateDocumentTheme(mode);
    this.themeApplier.applyCurrentTheme(this.state);
    // Also re-apply background to account for auto-dim behavior in dark mode
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
    
    // Sync with localStorage for consistency
    this.updateLocalStoragePreference(mode);
    
    // Auto-save with debouncing (only when not in preview mode)
    if (!this.state.isInPreview && this.userId) {
      this.autoSave.scheduleAutoSave(this.userId, this.saveTheme.bind(this));
    }
  }

  // Update localStorage preference when user changes theme
  private updateLocalStoragePreference(mode: 'light' | 'dark'): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme_mode_pref', mode);
      }
    } catch (error) {
      logger.warn('Failed to update localStorage theme preference:', error);
    }
  }

  // Public API - Theme colors
  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light' && !this.state.isInPreview) {
      this.themeApplier.applyCurrentTheme(this.state);
    }
    this.notifyListeners();
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark' && !this.state.isInPreview) {
      this.themeApplier.applyCurrentTheme(this.state);
    }
    this.notifyListeners();
  }

  // Public API - Background
  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = Math.max(0, Math.min(1, opacity));
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
  }

  setAutoDimDarkMode(enabled: boolean): void {
    this.state.autoDimDarkMode = enabled;
    this.themeApplier.applyCurrentBackground(this.state);
    this.notifyListeners();
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

      this.themeApplier.applyCurrentTheme(this.state);
      this.themeApplier.applyCurrentBackground(this.state);
      this.notifyListeners();

      // Automatically save as user's theme
      if (this.userId) {
        return await this.saveTheme();
      }

      return true;
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