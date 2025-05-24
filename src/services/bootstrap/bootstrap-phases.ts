
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

export enum BootstrapPhase {
  NOT_STARTED = 'not_started',
  LOADING_CONFIG = 'loading_config',
  CONFIG_LOADED = 'config_loaded',
  INITIALIZING_CLIENT = 'initializing_client',
  CLIENT_READY = 'client_ready',
  INITIALIZING_AUTH = 'initializing_auth',
  AUTH_READY = 'auth_ready',
  COMPLETE = 'complete',
  ERROR = 'error',
  NEEDS_SETUP = 'needs_setup'
}

export interface BootstrapState {
  phase: BootstrapPhase;
  config: SupabaseConfig | null;
  configSource: string | null;
  error: string | null;
  lastUpdated: number;
  progress: number; // 0-100
}

type BootstrapStateListener = (state: BootstrapState) => void;

/**
 * Manages the complete bootstrap process through all phases
 */
export class BootstrapPhaseManager {
  private static instance: BootstrapPhaseManager | null = null;
  private state: BootstrapState;
  private listeners: Set<BootstrapStateListener> = new Set();

  private constructor() {
    this.state = {
      phase: BootstrapPhase.NOT_STARTED,
      config: null,
      configSource: null,
      error: null,
      lastUpdated: Date.now(),
      progress: 0
    };
  }

  static getInstance(): BootstrapPhaseManager {
    if (!this.instance) {
      this.instance = new BootstrapPhaseManager();
    }
    return this.instance;
  }

  /**
   * Get current state
   */
  getState(): BootstrapState {
    return { ...this.state };
  }

  /**
   * Check if bootstrap is complete and ready
   */
  isReady(): boolean {
    return this.state.phase === BootstrapPhase.COMPLETE;
  }

  /**
   * Check if bootstrap needs user setup
   */
  needsSetup(): boolean {
    return this.state.phase === BootstrapPhase.NEEDS_SETUP;
  }

  /**
   * Check if there's an error
   */
  hasError(): boolean {
    return this.state.phase === BootstrapPhase.ERROR;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: BootstrapStateListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    try {
      listener(this.getState());
    } catch (error) {
      logger.error('Error in bootstrap state listener', error, { module: 'bootstrap-phases' });
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start loading configuration
   */
  startLoadingConfig(): void {
    this.updateState({
      phase: BootstrapPhase.LOADING_CONFIG,
      progress: 10,
      error: null
    });
  }

  /**
   * Configuration loaded successfully
   */
  configLoaded(config: SupabaseConfig, source: string): void {
    this.updateState({
      phase: BootstrapPhase.CONFIG_LOADED,
      config,
      configSource: source,
      progress: 25,
      error: null
    });
  }

  /**
   * Start initializing client
   */
  startInitializingClient(): void {
    this.updateState({
      phase: BootstrapPhase.INITIALIZING_CLIENT,
      progress: 40,
      error: null
    });
  }

  /**
   * Client ready
   */
  clientReady(): void {
    this.updateState({
      phase: BootstrapPhase.CLIENT_READY,
      progress: 60,
      error: null
    });
  }

  /**
   * Start initializing auth
   */
  startInitializingAuth(): void {
    this.updateState({
      phase: BootstrapPhase.INITIALIZING_AUTH,
      progress: 80,
      error: null
    });
  }

  /**
   * Auth ready
   */
  authReady(): void {
    this.updateState({
      phase: BootstrapPhase.AUTH_READY,
      progress: 95,
      error: null
    });
  }

  /**
   * Bootstrap complete
   */
  complete(): void {
    this.updateState({
      phase: BootstrapPhase.COMPLETE,
      progress: 100,
      error: null
    });
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.updateState({
      phase: BootstrapPhase.ERROR,
      error,
      // Don't reset progress on error so user can see how far we got
    });
  }

  /**
   * Set needs setup state
   */
  setNeedsSetup(): void {
    this.updateState({
      phase: BootstrapPhase.NEEDS_SETUP,
      progress: 0,
      error: null,
      config: null,
      configSource: null
    });
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = {
      phase: BootstrapPhase.NOT_STARTED,
      config: null,
      configSource: null,
      error: null,
      lastUpdated: Date.now(),
      progress: 0
    };
    this.notifyListeners();
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<BootstrapState>): void {
    const oldState = { ...this.state };
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };

    // Log phase changes
    if (oldState.phase !== this.state.phase) {
      logger.info('Bootstrap phase changed', {
        module: 'bootstrap-phases',
        oldPhase: oldState.phase,
        newPhase: this.state.phase,
        progress: this.state.progress,
        configSource: this.state.configSource,
        error: this.state.error
      });
    }

    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        logger.error('Error in bootstrap state listener', error, { module: 'bootstrap-phases' });
      }
    });
  }
}

// Export singleton instance
export const bootstrapPhases = BootstrapPhaseManager.getInstance();
