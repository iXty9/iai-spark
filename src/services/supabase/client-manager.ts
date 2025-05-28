
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
}

type ClientStateListener = (state: ClientState) => void;

/**
 * Enhanced client manager with proper readiness detection
 */
export class ClientManager {
  private static instance: ClientManager | null = null;
  private state: ClientState;
  private listeners: Set<ClientStateListener> = new Set();
  private readinessPromise: Promise<boolean> | null = null;

  private constructor() {
    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now(),
      isFullyReady: false
    };
  }

  static getInstance(): ClientManager {
    if (!this.instance) {
      this.instance = new ClientManager();
    }
    return this.instance;
  }

  /**
   * Initialize client with config and ensure full readiness
   */
  async initialize(config: SupabaseConfig): Promise<boolean> {
    try {
      this.updateState({
        status: ClientStatus.INITIALIZING,
        config,
        error: null,
        isFullyReady: false
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

      // Ensure client is fully functional
      await this.ensureClientReadiness(client);

      this.updateState({
        isFullyReady: true
      });

      logger.info('Supabase client initialized and ready', { module: 'client-manager' });
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize Supabase client', error, { module: 'client-manager' });
      
      this.updateState({
        status: ClientStatus.ERROR,
        client: null,
        error: errorMessage,
        isFullyReady: false
      });
      
      return false;
    }
  }

  /**
   * Ensure client is fully ready for operations
   */
  private async ensureClientReadiness(client: SupabaseClient): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        // Test auth functionality
        const { error } = await client.auth.getSession();
        
        if (error && error.message.includes('not available')) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          continue;
        }

        // Test database functionality
        const { error: dbError } = await client.from('profiles').select('count').limit(0);
        if (dbError && dbError.message.includes('not available')) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          continue;
        }
        
        // Client is ready
        logger.info('Client readiness verified', { module: 'client-manager' });
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    throw new Error('Client readiness verification failed after maximum attempts');
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
   * Destroy client and reset state
   */
  destroy(): void {
    this.state = {
      status: ClientStatus.NOT_INITIALIZED,
      client: null,
      config: null,
      error: null,
      lastUpdated: Date.now(),
      isFullyReady: false
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
