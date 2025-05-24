
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { clientLifecycleManager } from './client-lifecycle-manager';

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
  connectionId: string | null;
}

export class ClientManager {
  private static instance: ClientManager | null = null;
  private state: ClientState = {
    status: ClientStatus.NOT_INITIALIZED,
    client: null,
    config: null,
    error: null,
    connectionId: null
  };
  private subscribers: ((state: ClientState) => void)[] = [];

  static getInstance(): ClientManager {
    if (!this.instance) {
      this.instance = new ClientManager();
    }
    return this.instance;
  }

  /**
   * Initialize the Supabase client with configuration
   */
  async initialize(config: SupabaseConfig): Promise<boolean> {
    if (this.state.status === ClientStatus.INITIALIZING) {
      logger.warn('Client initialization already in progress', { module: 'client-manager' });
      return false;
    }

    this.updateState({
      status: ClientStatus.INITIALIZING,
      error: null
    });

    try {
      // Generate unique connection ID
      const connectionId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Clean up any existing clients
      clientLifecycleManager.cleanupAllClients();

      // Create new client
      const client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: localStorage,
          storageKey: 'supabase.auth.token',
          debug: process.env.NODE_ENV === 'development'
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'x-connection-id': connectionId
          }
        }
      });

      // Register with lifecycle manager
      clientLifecycleManager.registerClient(connectionId, client);

      // Store connection info
      localStorage.setItem('supabase_connection_id', connectionId);

      logger.info('Supabase client initialized successfully', {
        module: 'client-manager',
        connectionId,
        url: config.url.split('//')[1] // Log domain only for security
      });

      this.updateState({
        status: ClientStatus.READY,
        client,
        config,
        connectionId,
        error: null
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      
      logger.error('Failed to initialize Supabase client', error, { module: 'client-manager' });
      
      this.updateState({
        status: ClientStatus.ERROR,
        client: null,
        config: null,
        connectionId: null,
        error: errorMessage
      });

      return false;
    }
  }

  /**
   * Get the current client instance
   */
  getClient(): SupabaseClient | null {
    return this.state.client;
  }

  /**
   * Get the current state
   */
  getState(): ClientState {
    return { ...this.state };
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.state.status === ClientStatus.READY && this.state.client !== null;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: ClientState) => void): () => void {
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Destroy the client and clean up
   */
  async destroy(): Promise<void> {
    logger.info('Destroying Supabase client', { 
      module: 'client-manager',
      connectionId: this.state.connectionId
    });

    // Clean up lifecycle manager
    clientLifecycleManager.cleanupAllClients();

    // Reset state
    this.updateState({
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      connectionId: null,
      error: null
    });

    // Clear connection info
    localStorage.removeItem('supabase_connection_id');
  }

  /**
   * Health check for the client
   */
  async healthCheck(): Promise<boolean> {
    if (!this.state.client) {
      return false;
    }

    try {
      // Simple health check - try to get session
      const { error } = await this.state.client.auth.getSession();
      return !error;
    } catch (error) {
      logger.error('Client health check failed', error, { module: 'client-manager' });
      return false;
    }
  }

  private updateState(updates: Partial<ClientState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        logger.error('Error in client state subscriber', error, { module: 'client-manager' });
      }
    });
  }
}

// Export singleton instance
export const clientManager = ClientManager.getInstance();
