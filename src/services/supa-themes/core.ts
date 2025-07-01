import { ThemeColors, ThemeSettings } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

interface SupaThemeState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  isReady: boolean;
  
  // Preview state for settings
  isInPreview: boolean;
  previewMode: 'light' | 'dark' | null;
  previewLightTheme: ThemeColors | null;
  previewDarkTheme: ThemeColors | null;
  previewBackgroundImage: string | null | undefined;
  previewBackgroundOpacity: number | null;
  hasUnsavedChanges: boolean;
}

type StateListener = (state: SupaThemeState) => void;

class SupaThemesCore {
  private state: SupaThemeState;
  private listeners: Set<StateListener> = new Set();
  private userId: string | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.state = {
      mode: this.getSystemThemePreference(),
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

  private getSystemThemePreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      logger.warn('Failed to detect system theme preference', error);
      return 'light';
    }
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

  // Core initialization
  async initialize(userId?: string): Promise<void> {
    if (userId && userId !== this.userId) {
      this.userId = userId;
      await this.loadUserTheme();
      this.setupRealtimeSync();
    }
    
    this.state.isReady = true;
    this.applyCurrentTheme();
    this.applyCurrentBackground();
    this.notifyListeners();
    
    logger.info('SupaThemes initialized', { module: 'supa-themes', userId: this.userId });
  }

  // Load user theme from Supabase
  private async loadUserTheme(): Promise<void> {
    if (!this.userId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('theme_settings')
        .eq('id', this.userId)
        .single();

      if (error) {
        logger.warn('Could not load user theme, using defaults', error);
        return;
      }

      if (profile?.theme_settings) {
        const settings = JSON.parse(profile.theme_settings) as ThemeSettings;
        this.applyThemeSettings(settings);
        logger.info('User theme loaded from Supabase', { module: 'supa-themes' });
      }
    } catch (error) {
      logger.error('Error loading user theme:', error);
    }
  }

  // Apply theme settings to state
  private applyThemeSettings(settings: ThemeSettings): void {
    if (settings.mode) this.state.mode = settings.mode;
    if (settings.lightTheme) this.state.lightTheme = settings.lightTheme;
    if (settings.darkTheme) this.state.darkTheme = settings.darkTheme;
    if (settings.backgroundImage !== undefined) this.state.backgroundImage = settings.backgroundImage;
    if (settings.backgroundOpacity !== undefined) this.state.backgroundOpacity = settings.backgroundOpacity;
  }

  // Setup real-time sync for cross-browser updates
  private setupRealtimeSync(): void {
    if (!this.userId) return;

    // Clean up existing channel
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase
      .channel(`supa_themes_${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${this.userId}`
        },
        async (payload) => {
          if (payload.new?.theme_settings) {
            const settings = JSON.parse(payload.new.theme_settings) as ThemeSettings;
            this.applyThemeSettings(settings);
            this.applyCurrentTheme();
            this.applyCurrentBackground();
            this.notifyListeners();
            logger.info('Theme synced from real-time update', { module: 'supa-themes' });
          }
        }
      )
      .subscribe();
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

  // Theme application
  private applyCurrentTheme(): void {
    const currentTheme = this.getCurrentTheme();
    applyThemeChanges(currentTheme);
    this.updateDocumentMode();
  }

  private applyCurrentBackground(): void {
    applyBackgroundImage(this.state.backgroundImage, this.state.backgroundOpacity);
  }

  private updateDocumentMode(): void {
    const mode = this.state.previewMode || this.state.mode;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
  }

  private getCurrentTheme(): ThemeColors {
    const mode = this.state.previewMode || this.state.mode;
    
    if (mode === 'light') {
      return this.state.previewLightTheme || this.state.lightTheme;
    } else {
      return this.state.previewDarkTheme || this.state.darkTheme;
    }
  }

  // Public API - Theme mode
  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.applyCurrentTheme();
    this.notifyListeners();
  }

  // Public API - Theme colors
  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light' && !this.state.isInPreview) {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark' && !this.state.isInPreview) {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
  }

  // Public API - Background
  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    this.applyCurrentBackground();
    this.notifyListeners();
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = Math.max(0, Math.min(1, opacity));
    this.applyCurrentBackground();
    this.notifyListeners();
  }

  // Preview mode for settings
  enterPreviewMode(): void {
    if (this.state.isInPreview) return;
    
    this.state.isInPreview = true;
    this.state.previewMode = this.state.mode;
    this.state.hasUnsavedChanges = false;
    this.notifyListeners();
  }

  exitPreviewMode(save: boolean = false): void {
    if (!this.state.isInPreview) return;
    
    if (!save) {
      // Revert to original state
      this.applyCurrentTheme();
      this.applyCurrentBackground();
    }
    
    this.state.isInPreview = false;
    this.state.previewMode = null;
    this.state.previewLightTheme = null;
    this.state.previewDarkTheme = null;
    this.state.previewBackgroundImage = undefined;
    this.state.previewBackgroundOpacity = null;
    this.state.hasUnsavedChanges = false;
    this.notifyListeners();
  }

  // Preview updates
  previewMode(mode: 'light' | 'dark'): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewMode = mode;
    this.state.hasUnsavedChanges = true;
    this.applyCurrentTheme();
    this.notifyListeners();
  }

  previewLightTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewLightTheme = theme;
    this.state.hasUnsavedChanges = true;
    
    if ((this.state.previewMode || this.state.mode) === 'light') {
      this.applyCurrentTheme();
    }
    this.notifyListeners();
  }

  previewDarkTheme(theme: ThemeColors): void {
    if (!this.state.isInPreview) this.enterPreviewMode();
    
    this.state.previewDarkTheme = theme;
    this.state.hasUnsavedChanges = true;
    
    if ((this.state.previewMode || this.state.mode) === 'dark') {
      this.applyCurrentTheme();
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

  // Save to Supabase
  async saveTheme(): Promise<boolean> {
    if (!this.userId) {
      logger.warn('Cannot save theme: no user ID');
      return false;
    }

    try {
      // Commit preview changes to main state
      if (this.state.isInPreview) {
        if (this.state.previewMode !== null) this.state.mode = this.state.previewMode;
        if (this.state.previewLightTheme) this.state.lightTheme = this.state.previewLightTheme;
        if (this.state.previewDarkTheme) this.state.darkTheme = this.state.previewDarkTheme;
        if (this.state.previewBackgroundImage !== undefined) this.state.backgroundImage = this.state.previewBackgroundImage;
        if (this.state.previewBackgroundOpacity !== null) this.state.backgroundOpacity = this.state.previewBackgroundOpacity;
      }

      const themeSettings: ThemeSettings = {
        mode: this.state.mode,
        lightTheme: this.state.lightTheme,
        darkTheme: this.state.darkTheme,
        backgroundImage: this.state.backgroundImage,
        backgroundOpacity: this.state.backgroundOpacity,
        exportDate: new Date().toISOString(),
        name: 'Custom Theme'
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          theme_settings: JSON.stringify(themeSettings),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.userId);

      if (error) {
        logger.error('Failed to save theme to Supabase:', error);
        return false;
      }

      // Exit preview mode after successful save
      this.exitPreviewMode(true);
      
      logger.info('Theme saved successfully', { module: 'supa-themes' });
      return true;
    } catch (error) {
      logger.error('Error saving theme:', error);
      return false;
    }
  }

  // Reset to defaults
  async resetToDefaults(): Promise<boolean> {
    try {
      // Load admin default theme settings first
      const adminDefaults = await this.loadAdminDefaultTheme();
      
      if (adminDefaults) {
        // Apply admin defaults
        this.state.mode = adminDefaults.mode || 'light';
        this.state.lightTheme = adminDefaults.lightTheme || this.getDefaultLightTheme();
        this.state.darkTheme = adminDefaults.darkTheme || this.getDefaultDarkTheme();
        this.state.backgroundImage = adminDefaults.backgroundImage || null;
        this.state.backgroundOpacity = adminDefaults.backgroundOpacity ?? 0.5;
      } else {
        // Fallback to hardcoded defaults if no admin defaults
        this.state.mode = 'light';
        this.state.lightTheme = this.getDefaultLightTheme();
        this.state.darkTheme = this.getDefaultDarkTheme();
        this.state.backgroundImage = null;
        this.state.backgroundOpacity = 0.5;
      }

      this.applyCurrentTheme();
      this.applyCurrentBackground();
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

  // Load admin default theme settings
  private async loadAdminDefaultTheme(): Promise<ThemeSettings | null> {
    try {
      const { getAppSettingsMap } = await import('@/services/admin/settings/generalSettings');
      const settings = await getAppSettingsMap();
      
      if (settings.default_theme_settings) {
        const parsedSettings = JSON.parse(settings.default_theme_settings) as ThemeSettings;
        logger.info('Admin default theme loaded for reset', { module: 'supa-themes' });
        return parsedSettings;
      }
      
      logger.info('No admin default theme found, using hardcoded defaults', { module: 'supa-themes' });
      return null;
    } catch (error) {
      logger.warn('Failed to load admin default theme, using hardcoded defaults:', error);
      return null;
    }
  }

  // Cleanup
  destroy(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
    this.userId = null;
  }
}

// Export singleton instance
export const supaThemes = new SupaThemesCore();