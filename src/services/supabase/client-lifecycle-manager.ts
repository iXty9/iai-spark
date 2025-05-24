
import { logger } from '@/utils/logging';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Manages the lifecycle of Supabase clients to prevent multiple instances
 * and ensure proper cleanup
 */
export class ClientLifecycleManager {
  private static instance: ClientLifecycleManager | null = null;
  private clients: Map<string, SupabaseClient> = new Map();
  private activeClientId: string | null = null;

  static getInstance(): ClientLifecycleManager {
    if (!this.instance) {
      this.instance = new ClientLifecycleManager();
    }
    return this.instance;
  }

  /**
   * Register a new client instance
   */
  registerClient(clientId: string, client: SupabaseClient): void {
    // Clean up any existing client with the same ID
    if (this.clients.has(clientId)) {
      this.cleanupClient(clientId);
    }

    this.clients.set(clientId, client);
    this.activeClientId = clientId;

    logger.info('Client registered', {
      module: 'client-lifecycle',
      clientId,
      totalClients: this.clients.size
    });

    // Warn if multiple clients are active
    if (this.clients.size > 1) {
      logger.warn('Multiple Supabase clients detected', {
        module: 'client-lifecycle',
        totalClients: this.clients.size,
        clientIds: Array.from(this.clients.keys())
      });
    }
  }

  /**
   * Get the active client
   */
  getActiveClient(): SupabaseClient | null {
    if (!this.activeClientId) {
      return null;
    }
    return this.clients.get(this.activeClientId) || null;
  }

  /**
   * Clean up a specific client
   */
  cleanupClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        // Remove auth listeners
        client.auth.stopAutoRefresh();
        
        // Remove realtime connections
        client.removeAllChannels();
        
        logger.info('Client cleaned up', {
          module: 'client-lifecycle',
          clientId
        });
      } catch (error) {
        logger.error('Error during client cleanup', error, {
          module: 'client-lifecycle',
          clientId
        });
      }
      
      this.clients.delete(clientId);
      
      if (this.activeClientId === clientId) {
        this.activeClientId = null;
      }
    }
  }

  /**
   * Clean up all clients
   */
  cleanupAllClients(): void {
    const clientIds = Array.from(this.clients.keys());
    
    logger.info('Cleaning up all clients', {
      module: 'client-lifecycle',
      totalClients: clientIds.length
    });

    for (const clientId of clientIds) {
      this.cleanupClient(clientId);
    }

    this.activeClientId = null;
  }

  /**
   * Get client statistics
   */
  getStats(): {
    totalClients: number;
    activeClientId: string | null;
    clientIds: string[];
  } {
    return {
      totalClients: this.clients.size,
      activeClientId: this.activeClientId,
      clientIds: Array.from(this.clients.keys())
    };
  }

  /**
   * Check if system has healthy client state
   */
  isHealthy(): boolean {
    return this.clients.size <= 1 && this.activeClientId !== null;
  }
}

// Export singleton instance
export const clientLifecycleManager = ClientLifecycleManager.getInstance();
