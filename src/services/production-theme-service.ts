import { ThemeColors, ThemeSettings } from '@/types/theme';
import { clientManager } from '@/services/supabase/client-manager';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

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
  private adminDefaults: ThemeSettings | null = null;
  private realtimeChannel: any = null;
  private adminDefaultsVersion: string | null = null;

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

  async initialize(): Promise<void> {
    // Allow re-initialization if client becomes available
    if (this.isInitialized) {
      const client = clientManager.getClient();
      if (!client) {
        logger.info('Theme service already initialized but no client available', { module: 'theme' });
        return;
      }
      // If we have a client now and we're re-initializing, continue
      this.isInitialized = false;
    }

    try {
      logger.info('Initializing production theme service', { module: 'theme' });

      // Determine user authentication status first
      const isSignedOut = await this.isUserSignedOut();
      
      if (isSignedOut) {
        // For signed-out users, ALWAYS load admin defaults from database
        await this.loadAdminDefaults();
        
        if (this.adminDefaults) {
          this.applyThemeSettings(this.adminDefaults);
          logger.info('Applied admin default theme for signed-out user', { module: 'theme' });
        } else {
          // Fallback to built-in defaults only if no admin defaults exist
          this.loadModeFromLocalStorage();
          logger.info('No admin defaults found, using built-in defaults', { module: 'theme' });
        }
      } else {
        // For signed-in users, try to load their personal settings
        const client = clientManager.getClient();
        if (client) {
          // Load admin defaults first for comparison
          await this.loadAdminDefaults();
          
          // Load from localStorage for immediate application
          this.loadFromLocalStorage();

          // Then try to load from database
          await this.loadUserSettings();
        } else {
          // No client available, use localStorage only
          this.loadFromLocalStorage();
        }
      }

      // Set up real-time listener for admin default changes
      this.setupRealtimeListener();

      // Apply the final theme state
      this.applyTheme();
      this.applyBackgroundToDOM();
      
      this.state.isReady = true;
      this.isInitialized = true;
      this.notifyListeners();
      
      logger.info('Theme service initialized successfully', { 
        module: 'theme',
        mode: this.state.mode,
        hasBackground: !!this.state.backgroundImage,
        isSignedOut,
        hasAdminDefaults: !!this.adminDefaults
      });
    } catch (error) {
      logger.error('Theme initialization failed', error, { module: 'theme' });
      // Still mark as ready to prevent hanging, but apply minimal theme
      this.applyTheme();
      this.state.isReady = true;
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  private async isUserSignedOut(): Promise<boolean> {
    try {
      const client = clientManager.getClient();
      if (!client) return true;

      const { data: { user } } = await client.auth.getUser();
      return !user;
    } catch (error) {
      logger.warn('Error checking user authentication status', { module: 'theme' });
      return true; // Assume signed out on error
    }
  }

  private async loadAdminDefaults(): Promise<void> {
    try {
      const appSettings = await fetchAppSettings();
      if (appSettings?.default_theme_settings) {
        const newDefaults = JSON.parse(appSettings.default_theme_settings) as ThemeSettings;
        const newVersion = newDefaults.exportDate || Date.now().toString();
        
        // Always update admin defaults to ensure we have the latest
        this.adminDefaults = newDefaults;
        this.adminDefaultsVersion = newVersion;
        logger.info('Admin default theme loaded', { 
          module: 'theme',
          version: newVersion
        });
      } else {
        this.adminDefaults = null;
        this.adminDefaultsVersion = null;
        logger.info('No admin default theme found', { module: 'theme' });
      }
    } catch (error) {
      logger.warn('Failed to load admin defaults', { module: 'theme' });
      this.adminDefaults = null;
    }
  }

  private applyThemeSettings(settings: ThemeSettings): void {
    this.state.mode = settings.mode || this.state.mode;
    this.state.lightTheme = settings.lightTheme || this.state.lightTheme;
    this.state.darkTheme = settings.darkTheme || this.state.darkTheme;
    this.state.backgroundImage = settings.backgroundImage || null;
    this.state.backgroundOpacity = settings.backgroundOpacity || 0.5;
  }

  private loadModeFromLocalStorage(): void {
    try {
      const savedMode = localStorage.getItem('theme-mode');
      if (savedMode === 'light' || savedMode === 'dark') {
        this.state.mode = savedMode;
      }
    } catch (error) {
      logger.warn('Failed to load mode from localStorage', { module: 'theme' });
    }
  }

  private loadFromLocalStorage(): void {
    try {
      // Load basic mode
      this.loadModeFromLocalStorage();

      // Load background settings
      const savedBg = localStorage.getItem('background-image');
      const savedOpacity = localStorage.getItem('background-opacity');
      if (savedBg) {
        this.state.backgroundImage = savedBg;
        this.state.backgroundOpacity = savedOpacity ? parseFloat(savedOpacity) : 0.5;
      }

      // Load theme settings
      const savedThemeSettings = localStorage.getItem('theme_settings');
      if (savedThemeSettings) {
        try {
          const settings = JSON.parse(savedThemeSettings) as ThemeSettings;
          this.applyThemeSettings(settings);
          logger.info('Loaded theme from localStorage', { module: 'theme' });
        } catch (parseError) {
          logger.warn('Failed to parse theme settings from localStorage', { module: 'theme' });
        }
      }
    } catch (error) {
      logger.warn('Failed to load from localStorage', { module: 'theme' });
    }
  }

  private async loadUserSettings(): Promise<void> {
    try {
      const client = clientManager.getClient();
      if (!client) return;

      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await client
        .from('profiles')
        .select('theme_settings')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn('Could not load user theme settings', { module: 'theme' });
        return;
      }

      if (profile?.theme_settings) {
        const settings = JSON.parse(profile.theme_settings) as ThemeSettings;
        this.applyThemeSettings(settings);
        
        // Save to localStorage for future sessions
        localStorage.setItem('theme_settings', JSON.stringify(settings));
        if (settings.backgroundImage) {
          localStorage.setItem('background-image', settings.backgroundImage);
          localStorage.setItem('background-opacity', this.state.backgroundOpacity.toString());
        }
        
        logger.info('Loaded user theme settings', { module: 'theme' });
      }
    } catch (error) {
      logger.warn('Failed to load user settings', { module: 'theme' });
    }
  }

  private setupRealtimeListener(): void {
    try {
      const client = clientManager.getClient();
      if (!client) return;

      // Listen for changes to app_settings table
      this.realtimeChannel = client
        .channel('admin-theme-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_settings',
            filter: 'key=eq.default_theme_settings'
          },
          (payload) => {
            logger.info('Admin theme settings changed, updating theme', { module: 'theme' });
            this.handleAdminThemeChange(payload);
          }
        )
        .subscribe();

      logger.info('Real-time listener for admin theme changes set up', { module: 'theme' });
    } catch (error) {
      logger.warn('Failed to set up real-time listener', { module: 'theme' });
    }
  }

  private async handleAdminThemeChange(payload: any): Promise<void> {
    try {
      // Reload admin defaults
      await this.loadAdminDefaults();
      
      const isSignedOut = await this.isUserSignedOut();
      
      // For signed-out users, always apply new admin defaults immediately
      if (isSignedOut && this.adminDefaults) {
        this.applyThemeSettings(this.adminDefaults);
        this.applyTheme();
        this.applyBackgroundToDOM();
        this.notifyListeners();
        
        logger.info('Applied updated admin theme for signed-out user', { module: 'theme' });
      }
    } catch (error) {
      logger.error('Error handling admin theme change', error, { module: 'theme' });
    }
  }

  private applyTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    
    // Apply all theme colors to CSS variables and body
    const root = document.documentElement;
    root.style.setProperty('--background-color', currentColors.backgroundColor);
    root.style.setProperty('--primary-color', currentColors.primaryColor);
    root.style.setProperty('--text-color', currentColors.textColor);
    root.style.setProperty('--accent-color', currentColors.accentColor);
    root.style.setProperty('--user-bubble-color', currentColors.userBubbleColor);
    root.style.setProperty('--ai-bubble-color', currentColors.aiBubbleColor);
    root.style.setProperty('--user-bubble-opacity', currentColors.userBubbleOpacity.toString());
    root.style.setProperty('--ai-bubble-opacity', currentColors.aiBubbleOpacity.toString());
    root.style.setProperty('--user-text-color', currentColors.userTextColor);
    root.style.setProperty('--ai-text-color', currentColors.aiTextColor);

    // Apply background color to body immediately
    document.body.style.backgroundColor = currentColors.backgroundColor;
    document.body.style.color = currentColors.textColor;

    // Apply dark/light class
    document.documentElement.classList.toggle('dark', this.state.mode === 'dark');
    
    // Save mode
    localStorage.setItem('theme-mode', this.state.mode);
    
    logger.info('Theme applied', { 
      mode: this.state.mode, 
      backgroundColor: currentColors.backgroundColor 
    });
  }

  private applyBackgroundToDOM(): void {
    const body = document.body;
    
    if (this.state.backgroundImage) {
      body.style.backgroundImage = `url(${this.state.backgroundImage})`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundAttachment = 'fixed';
      body.classList.add('with-bg-image');
      
      // Apply background opacity correctly
      document.documentElement.style.setProperty('--bg-opacity', this.state.backgroundOpacity.toString());
      
      logger.info('Background image applied', { 
        opacity: this.state.backgroundOpacity,
        hasImage: !!this.state.backgroundImage 
      });
    } else {
      body.style.backgroundImage = '';
      body.classList.remove('with-bg-image');
      document.documentElement.style.setProperty('--bg-opacity', '0.5');
    }
  }

  // Public API
  getState(): ThemeState {
    return { ...this.state };
  }

  subscribe(listener: (state: ThemeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setMode(mode: 'light' | 'dark'): void {
    this.state.mode = mode;
    this.applyTheme();
    this.notifyListeners();
    this.saveToProfile();
  }

  setBackgroundImage(image: string | null): void {
    this.state.backgroundImage = image;
    if (image) {
      localStorage.setItem('background-image', image);
    } else {
      localStorage.removeItem('background-image');
    }
    this.applyBackgroundToDOM();
    this.notifyListeners();
    this.saveToProfile();
  }

  setBackgroundOpacity(opacity: number): void {
    this.state.backgroundOpacity = Math.max(0, Math.min(1, opacity));
    localStorage.setItem('background-opacity', this.state.backgroundOpacity.toString());
    this.applyBackgroundToDOM();
    this.notifyListeners();
    this.saveToProfile();
  }

  setLightTheme(theme: ThemeColors): void {
    this.state.lightTheme = theme;
    if (this.state.mode === 'light') {
      this.applyTheme();
    }
    this.notifyListeners();
    this.saveToProfile();
  }

  setDarkTheme(theme: ThemeColors): void {
    this.state.darkTheme = theme;
    if (this.state.mode === 'dark') {
      this.applyTheme();
    }
    this.notifyListeners();
    this.saveToProfile();
  }

  // Create theme settings for saving
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

  /**
   * Load default theme from database
   */
  async loadDefaultTheme(): Promise<boolean> {
    try {
      if (this.adminDefaults) {
        this.applyThemeSettings(this.adminDefaults);
        this.applyTheme();
        this.applyBackgroundToDOM();
        this.notifyListeners();
        this.saveToProfile();
        
        logger.info('Default theme loaded successfully', { module: 'theme' });
        return true;
      } else {
        logger.warn('No admin default theme settings found', { module: 'theme' });
        return false;
      }
    } catch (error) {
      logger.error('Failed to load default theme', error, { module: 'theme' });
      return false;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        logger.error('Error in theme listener', error, { module: 'theme' });
      }
    });
  }

  private async saveToProfile(): Promise<void> {
    try {
      const client = clientManager.getClient();
      if (!client) return;

      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const themeSettings = this.createThemeSettings();

      // Save to localStorage immediately for persistence
      localStorage.setItem('theme_settings', JSON.stringify(themeSettings));

      await client
        .from('profiles')
        .update({ theme_settings: JSON.stringify(themeSettings) })
        .eq('id', user.id);

      logger.info('Theme settings saved to profile', { module: 'theme' });
    } catch (error) {
      logger.warn('Failed to save theme settings to profile', { module: 'theme' });
    }
  }

  // Cleanup method for real-time listener
  destroy(): void {
    if (this.realtimeChannel) {
      const client = clientManager.getClient();
      if (client) {
        client.removeChannel(this.realtimeChannel);
      }
      this.realtimeChannel = null;
    }
  }
}

export const productionThemeService = new ProductionThemeService();
