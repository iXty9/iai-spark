import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

export interface ConnectionTestResult {
  isConnected: boolean;
  error?: string;
  details?: {
    authStatus: string;
    databaseStatus: string;
    functionsStatus?: string;
  };
}

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

class ConnectionService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConnectionConfig | null = null;

  async initialize(config: SupabaseConnectionConfig): Promise<void> {
    try {
      this.config = config;
      this.client = createClient(config.url, config.anonKey);
      logger.info('Connection service initialized', { module: 'connection-service' });
    } catch (error) {
      logger.error('Failed to initialize connection service', error, { module: 'connection-service' });
      throw error;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.client || !this.config) {
      return {
        isConnected: false,
        error: 'Connection service not initialized'
      };
    }

    try {
      // Test auth connection
      const { data: authData, error: authError } = await this.client.auth.getUser();
      
      // Test database connection with a simple query
      const { data: dbData, error: dbError } = await this.client
        .from('profiles')
        .select('count')
        .limit(1);

      const authStatus = authError ? 'error' : 'connected';
      const databaseStatus = dbError ? 'error' : 'connected';

      const isConnected = authStatus === 'connected' && databaseStatus === 'connected';

      return {
        isConnected,
        details: {
          authStatus,
          databaseStatus
        }
      };
    } catch (error) {
      logger.error('Connection test failed', error, { module: 'connection-service' });
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  getConfig(): SupabaseConnectionConfig | null {
    return this.config;
  }

  disconnect(): void {
    this.client = null;
    this.config = null;
    logger.info('Connection service disconnected', { module: 'connection-service' });
  }
}

export const connectionService = new ConnectionService();
