
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

export enum ConfigStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  NEEDS_SETUP = 'needs_setup'
}

export interface ConfigState {
  status: ConfigStatus;
  config: SupabaseConfig | null;
  source: string | null;
  error: string | null;
  lastUpdated: number;
}

type ConfigStateListener = (state: ConfigState) => void;

/**
 * Simple state manager for configuration
 * No complex reducers, just simple state updates with notifications
 */
export class ConfigStateManager {
  private static instance: ConfigStateManager | null = null;
  private state: ConfigState;
  private listeners: Set<ConfigStateListener> = new Set();

  private constructor() {
    this.state = {
      status: ConfigStatus.LOADING,
      config: null,
      source: null,
      error: null,
      lastUpdated: Date.now()
    };
  }

  static getInstance(): ConfigStateManager {
    if (!this.instance) {
      this.instance = new ConfigStateManager();
    }
    return this.instance;
  }

  /**
   * Get current state
   */
  getState(): ConfigState {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  updateState(updates: Partial<ConfigState>): void {
    const oldState = { ...this.state };
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };

    // Only log significant state changes
    if (oldState.status !== this.state.status || oldState.error !== this.state.error) {
      logger.info('Config state updated', {
        module: 'config-state',
        oldStatus: oldState.status,
        newStatus: this.state.status,
        source: this.state.source,
        hasConfig: !!this.state.config,
        error: this.state.error
      });
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        logger.error('Error in state listener', error, { module: 'config-state' });
      }
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ConfigStateListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    try {
      listener(this.getState());
    } catch (error) {
      logger.error('Error in initial state listener call', error, { module: 'config-state' });
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set loading state
   */
  setLoading(): void {
    this.updateState({
      status: ConfigStatus.LOADING,
      error: null
    });
  }

  /**
   * Set ready state with config
   */
  setReady(config: SupabaseConfig, source: string): void {
    this.updateState({
      status: ConfigStatus.READY,
      config,
      source,
      error: null
    });
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.updateState({
      status: ConfigStatus.ERROR,
      error,
      config: null,
      source: null
    });
  }

  /**
   * Set needs setup state
   */
  setNeedsSetup(): void {
    this.updateState({
      status: ConfigStatus.NEEDS_SETUP,
      error: null,
      config: null,
      source: null
    });
  }

  /**
   * Reset state to initial
   */
  reset(): void {
    this.state = {
      status: ConfigStatus.LOADING,
      config: null,
      source: null,
      error: null,
      lastUpdated: Date.now()
    };
  }
}

// Export singleton instance
export const configState = ConfigStateManager.getInstance();
