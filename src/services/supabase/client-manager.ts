
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
 * Reliable singleton client manager that prevents multiple instances
 * and provides proper lifecycle management
 */
export class SupabaseClientManager {
  private static instance: SupabaseClientManager | null = null;
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

  static getInstance(): SupabaseClientManager {
    if (!this.instance) {
      this.instance = new SupabaseClientManager();
    }
    return this.instance;
  }

  /**
   * Get current state
   */
  getState(): ClientState {
    return { ...this.state };
  }

  /**
   * Get client synchronously (returns null if not ready)
   */
  getClient(): SupabaseClient | null {
    return this.state.client;
  }

  /**
   * Initialize client with configuration
   */
  async initialize(config: SupabaseConfig): Promise<boolean> {
    if (this.state.status === ClientStatus.INITIALIZING) {
      logger.warn('Client initialization already in progress', { module: 'client-manager' });
      return false;
    }

    this.updateState({
      status: ClientStatus.INITIALIZING,
      config,
      error: null
    });

    try {
      // Destroy existing client if any
      if (this.state.client) {
        await this.destroy();
      }

      // Create new client with proper configuration
      const client = createClient(config.url, config.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          debug: process.env.NODE_ENV === 'development'
        }
      });

      // Test the client with a simple operation
      const { error } = await client.auth.getSession();
      
      if (error && error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
        throw new Error(`Client initialization failed: ${error.message}`);
      }

      this.updateState({
        status: ClientStatus.READY,
        client,
        error: null
      });

      logger.info('Supabase client initialized successfully', {
        module: 'client-manager',
        url: config.url.split('//')[1] // Log domain only for security
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.updateState({
        status: ClientStatus.ERROR,
        client: null,
        error: errorMessage
      });

      logger.error('Failed to initialize Supabase client', error, { module: 'client-manager' });
      return false;
    }
  }

  /**
   * Destroy current client and reset state
   */
  async destroy(): Promise<void> {
    if (this.state.client) {
      try {
        // Sign out if there's an active session
        await this.state.client.auth.signOut({ scope: 'local' });
      } catch (error) {
        logger.warn('Error during client cleanup', error, { module: 'client-manager' });
      }
    }

    this.updateState({
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null
    });

    logger.info('Supabase client destroyed', { module: 'client-manager' });
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

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<ClientState>): void {
    const oldState = { ...this.state };
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };

    // Log significant state changes
    if (oldState.status !== this.state.status) {
      logger.info('Client state updated', {
        module: 'client-manager',
        oldStatus: oldState.status,
        newStatus: this.state.status,
        hasClient: !!this.state.client,
        error: this.state.error
      });
    }

    // Notify all listeners
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
export const clientManager = SupabaseClientManager.getInstance();
