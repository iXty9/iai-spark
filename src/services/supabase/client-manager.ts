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
  isFullyReady: boolean;
  realtimeConnected: boolean;
}

type ClientStateListener = (state: ClientState) => void;

/**
 * Enhanced client manager with proper realtime configuration
 */
export class ClientManager {
  private static instance: ClientManager | null = null;
  private state: ClientState;
  private listeners: Set<ClientStateListener> = new Set();
  private readinessPromise: Promise<boolean> | null = null;
  private realtimeHealthCheck: NodeJS.Timeout | null = null;

  private constructor() {
    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now(),
      isFullyReady: false,
      realtimeConnected: false
    };
  }

  static getInstance(): ClientManager {
    if (!this.instance) {
      this.instance = new ClientManager();
    }
    return this.instance;
  }

  /**
   * Initialize client with proper realtime configuration
   */
  async initialize(config: SupabaseConfig): Promise<boolean> {
    try {
      this.updateState({
        status: ClientStatus.INITIALIZING,
        config,
        error: null,
        isFullyReady: false,
        realtimeConnected: false
      });

      logger.info('Initializing Supabase client with realtime config', { 
        module: 'client-manager',
        url: config.url.split('//')[1]
      });

      const client = createClient(config.url, config.anonKey, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          },
          heartbeatIntervalMs: 30000,
          reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
          timeout: 20000,
          transport: 'websocket'
        },
        global: {
          headers: {
            'x-client-info': 'supabase-js-web'
          }
        }
      });

      this.updateState({
        status: ClientStatus.READY,
        client,
        error: null
      });

      // Test realtime connectivity with proper error handling
      await this.testRealtimeConnection(client);

      this.updateState({
        isFullyReady: true
      });

      // Start realtime health monitoring
      this.startRealtimeHealthCheck();

      logger.info('Supabase client initialized successfully', { 
        module: 'client-manager',
        realtimeConnected: this.state.realtimeConnected
      });
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize Supabase client', error, { module: 'client-manager' });
      
      this.updateState({
        status: ClientStatus.ERROR,
        client: null,
        error: errorMessage,
        isFullyReady: false,
        realtimeConnected: false
      });
      
      return false;
    }
  }

  /**
   * Test realtime connection independently
   */
  private async testRealtimeConnection(client: SupabaseClient): Promise<void> {
    return new Promise((resolve) => {
      logger.info('Testing realtime connection...', { module: 'client-manager' });
      
      const testChannel = client.channel('connection-test', {
        config: { broadcast: { self: true } }
      });

      const timeout = setTimeout(() => {
        logger.warn('Realtime connection test timed out', { module: 'client-manager' });
        client.removeChannel(testChannel);
        this.updateState({ realtimeConnected: false });
        resolve(); // Don't fail initialization, just mark realtime as disconnected
      }, 15000);

      testChannel
        .on('broadcast', { event: 'test' }, () => {
          logger.info('Realtime connection test successful', { module: 'client-manager' });
          clearTimeout(timeout);
          client.removeChannel(testChannel);
          this.updateState({ realtimeConnected: true });
          resolve();
        })
        .subscribe((status) => {
          logger.info('Test channel subscription status:', status, { module: 'client-manager' });
          
          if (status === 'SUBSCRIBED') {
            // Send test message
            testChannel.send({
              type: 'broadcast',
              event: 'test',
              payload: { test: true }
            });
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Test channel subscription failed', null, { module: 'client-manager' });
            clearTimeout(timeout);
            client.removeChannel(testChannel);
            this.updateState({ realtimeConnected: false });
            resolve();
          }
        });
    });
  }

  /**
   * Start periodic realtime health checks
   */
  private startRealtimeHealthCheck(): void {
    if (this.realtimeHealthCheck) {
      clearInterval(this.realtimeHealthCheck);
    }

    this.realtimeHealthCheck = setInterval(async () => {
      if (this.state.client && this.state.isFullyReady) {
        try {
          await this.testRealtimeConnection(this.state.client);
        } catch (error) {
          logger.warn('Realtime health check failed', error, { module: 'client-manager' });
          this.updateState({ realtimeConnected: false });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Force reconnect realtime
   */
  async forceReconnectRealtime(): Promise<boolean> {
    if (!this.state.client) {
      logger.warn('Cannot reconnect: no client available', { module: 'client-manager' });
      return false;
    }

    logger.info('Force reconnecting realtime...', { module: 'client-manager' });
    
    try {
      await this.testRealtimeConnection(this.state.client);
      return this.state.realtimeConnected;
    } catch (error) {
      logger.error('Force reconnect failed', error, { module: 'client-manager' });
      return false;
    }
  }

  /**
   * Wait for client to be fully ready
   */
  async waitForReadiness(): Promise<boolean> {
    if (this.state.isFullyReady) {
      return true;
    }

    if (this.readinessPromise) {
      return this.readinessPromise;
    }

    this.readinessPromise = new Promise((resolve) => {
      if (this.state.isFullyReady) {
        resolve(true);
        return;
      }

      const unsubscribe = this.subscribe((state) => {
        if (state.isFullyReady) {
          unsubscribe();
          resolve(true);
        } else if (state.status === ClientStatus.ERROR) {
          unsubscribe();
          resolve(false);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, 30000);
    });

    return this.readinessPromise;
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
   * Check if client is fully ready
   */
  isReady(): boolean {
    return this.state.isFullyReady;
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
   * Check if realtime is connected
   */
  isRealtimeConnected(): boolean {
    return this.state.realtimeConnected;
  }

  /**
   * Destroy client and reset state
   */
  destroy(): void {
    if (this.realtimeHealthCheck) {
      clearInterval(this.realtimeHealthCheck);
      this.realtimeHealthCheck = null;
    }

    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now(),
      isFullyReady: false,
      realtimeConnected: false
    };
    this.readinessPromise = null;
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
