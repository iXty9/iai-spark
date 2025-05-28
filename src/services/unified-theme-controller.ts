import { ThemeColors, ThemeSettings } from '@/types/theme';
import { themeService } from '@/services/theme-service';
import { backgroundStateManager } from '@/services/background-state-manager';
import { clientManager } from '@/services/supabase/client-manager';
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
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.state = {
      mode: 'light',
      lightTheme: this.getDefaultLightTheme(),
      darkTheme: this.getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5
    };

    // Subscribe to background state changes
    backgroundStateManager.subscribe((backgroundState) => {
      this.state.backgroundImage = backgroundState.image;
      this.state.backgroundOpacity = backgroundState.opacity;
      this.notifyListeners();
    });
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
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.initializationPromise = this.performInitialization(userSettings);
    return this.initializationPromise;
  }

  private async performInitialization(userSettings?: ThemeSettings): Promise<void> {
    try {
      logger.info('Initializing unified theme controller', { module: 'theme-controller' });

      // Wait for client to be ready before loading user settings
      const isClientReady = await clientManager.waitForReadiness();
      if (isClientReady) {
        logger.info('Client ready, loading user theme settings', { module: 'theme-controller' });
        
        // Try to load user settings from profile if client is ready
        if (!userSettings) {
          userSettings = await this.loadUserThemeSettings();
        }
      } else {
        logger.warn('Client not ready, using default theme settings', { module: 'theme-controller' });
      }

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
        
        // Load background through the background manager with proper JSON string
        await backgroundStateManager.loadFromProfile(JSON.stringify(userSettings));
        
        logger.info('Initialized with user settings', { 
          module: 'theme-controller',
          backgroundImage: !!this.state.backgroundImage,
          backgroundOpacity: this.state.backgroundOpacity
        });
      } else {
        // Load default background state
        await backgroundStateManager.loadFromProfile(null);
        logger.info('Initialized with default settings', { module: 'theme-controller' });
      }

      // Apply theme immediately
      this.applyCurrentTheme();
      
      this.isInitialized = true;
      this.initializationPromise = null;
      
      logger.info('Unified theme controller initialized', { 
        module: 'theme-controller',
        backgroundImage: !!this.state.backgroundImage,
        backgroundOpacity: this.state.backgroundOpacity
      });
    } catch (error) {
      logger.error('Failed to initialize theme controller:', error);
      this.isInitialized = true; // Prevent infinite retries
      this.initializationPromise = null;
    }
  }

  private async loadUserThemeSettings(): Promise<ThemeSettings | null> {
    try {
      const client = clientManager.getClient();
      if (!client) {
        logger.warn('No client available for loading user theme settings', { module: 'theme-controller' });
        return null;
      }

      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        logger.info('No authenticated user, using defaults', { module: 'theme-controller' });
        return null;
      }

      const { data: profile, error } = await client
        .from('profiles')
        .select('theme_settings')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading user profile for theme settings:', error, { module: 'theme-controller' });
        return null;
      }

      if (profile?.theme_settings) {
        try {
          const themeSettings = JSON.parse(profile.theme_settings);
          logger.info('Loaded theme settings from user profile', { 
            module: 'theme-controller',
            hasBackground: !!themeSettings.backgroundImage
          });
          return themeSettings;
        } catch (parseError) {
          logger.error('Error parsing theme settings from profile:', parseError, { module: 'theme-controller' });
        }
      }

      return null;
    } catch (error) {
      logger.error('Error loading user theme settings:', error, { module: 'theme-controller' });
      return null;
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

  updateState(partialState: Partial<ThemeState>): void {
    this.state = { ...this.state, ...partialState };
    
    // Apply theme if mode or colors changed
    if (partialState.mode || partialState.lightTheme || partialState.darkTheme) {
      this.applyCurrentTheme();
    }
    
    // Update background if background properties changed
    if (partialState.backgroundImage !== undefined) {
      backgroundStateManager.updateImage(partialState.backgroundImage);
    }
    
    if (partialState.backgroundOpacity !== undefined) {
      backgroundStateManager.updateOpacity(partialState.backgroundOpacity);
    }
    
    this.notifyListeners();
    logger.info('Theme state updated', { 
      module: 'theme-controller', 
      updatedKeys: Object.keys(partialState) 
    });
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
    backgroundStateManager.updateImage(image);
    logger.info('Background image updated via controller', { 
      module: 'theme-controller', 
      hasImage: !!image 
    });
  }

  setBackgroundOpacity(opacity: number): void {
    backgroundStateManager.updateOpacity(opacity);
    logger.info('Background opacity updated via controller', { 
      module: 'theme-controller', 
      opacity 
    });
  }

  private applyCurrentTheme(): void {
    const currentColors = this.state.mode === 'dark' ? this.state.darkTheme : this.state.lightTheme;
    themeService.applyThemeImmediate(currentColors, this.state.mode);
  }

  createThemeSettings(): ThemeSettings {
    const backgroundSettings = backgroundStateManager.createThemeSettings();
    return {
      mode: this.state.mode,
      lightTheme: this.state.lightTheme,
      darkTheme: this.state.darkTheme,
      backgroundImage: backgroundSettings.backgroundImage,
      backgroundOpacity: backgroundSettings.backgroundOpacity,
      exportDate: new Date().toISOString(),
      name: 'Custom Theme'
    };
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

export const unifiedThemeController = new UnifiedThemeController();
