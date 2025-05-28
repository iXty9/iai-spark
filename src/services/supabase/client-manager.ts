
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

export enum ClientStatus {
  NOT_INITIALIZED = 'not_initialized',
  INITIALIZING = 'initializing', 
  READY = 'ready',
  ERROR = 'error'
}

export interface ClientState {
  status: ClientStatus;
  client: SupabaseClient | null;
  config: SupabaseConfig | null;
  error: string | null;
  lastUpdated: number;
}

type ClientStateListener = (state: ClientState) => void;

/**
 * Simplified client manager for fast bootstrap
 */
export class ClientManager {
  private static instance: ClientManager | null = null;
  private state: ClientState;
  private listeners: Set<ClientStateListener> = new Set();

  private constructor() {
    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now()
    };
  }

  static getInstance(): ClientManager {
    if (!this.instance) {
      this.instance = new ClientManager();
    }
    return this.instance;
  }

  /**
   * Initialize client with config
   */
  async initialize(config: SupabaseConfig): Promise<boolean> {
    try {
      this.updateState({
        status: ClientStatus.INITIALIZING,
        config,
        error: null
      });

      logger.info('Initializing Supabase client', { 
        module: 'client-manager',
        url: config.url.split('//')[1]
      });

      const client = createClient(config.url, config.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      this.updateState({
        status: ClientStatus.READY,
        client,
        error: null
      });

      logger.info('Supabase client initialized successfully', { module: 'client-manager' });
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize Supabase client', error, { module: 'client-manager' });
      
      this.updateState({
        status: ClientStatus.ERROR,
        client: null,
        error: errorMessage
      });
      
      return false;
    }
  }

  /**
   * Get current client
   */
  getClient(): SupabaseClient | null {
    return this.state.client;
  }

  /**
   * Get current state
   */
  getState(): ClientState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ClientStateListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    try {
      listener(this.getState());
    } catch (error) {
      logger.error('Error in client state listener', error, { module: 'client-manager' });
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Destroy client and reset state
   */
  destroy(): void {
    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now()
    };
    this.notifyListeners();
    logger.info('Client manager destroyed', { module: 'client-manager' });
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<ClientState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };
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
        logger.error('Error in client state listener', error, { module: 'client-manager' });
      }
    });
  }
}

// Export singleton instance
export const clientManager = ClientManager.getInstance();
