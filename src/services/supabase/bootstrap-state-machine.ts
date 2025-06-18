
import { logger } from '@/utils/logging';
import { configManager } from '@/services/config/ConfigurationManager';

export type BootstrapState = 
  | 'idle'
  | 'loading_config'
  | 'testing_connection'
  | 'initializing'
  | 'ready'
  | 'error';

export interface BootstrapContext {
  state: BootstrapState;
  error?: string;
  config?: any;
  attempt: number;
}

/**
 * Simplified bootstrap state machine
 */
export class BootstrapStateMachine {
  private context: BootstrapContext = {
    state: 'idle',
    attempt: 0
  };

  async start(): Promise<BootstrapContext> {
    try {
      this.context.state = 'loading_config';
      this.context.attempt++;

      const configResult = await configManager.loadConfiguration();
      
      if (!configResult.success) {
        this.context.state = 'error';
        this.context.error = configResult.error;
        return this.context;
      }

      this.context.config = configResult.config;
      this.context.state = 'ready';
      
      logger.info('Bootstrap state machine completed successfully', {
        module: 'bootstrap-state-machine',
        attempts: this.context.attempt
      });

      return this.context;
    } catch (error) {
      this.context.state = 'error';
      this.context.error = error instanceof Error ? error.message : String(error);
      
      logger.error('Bootstrap state machine failed', error, {
        module: 'bootstrap-state-machine'
      });

      return this.context;
    }
  }

  getState(): BootstrapState {
    return this.context.state;
  }

  getContext(): BootstrapContext {
    return { ...this.context };
  }

  reset(): void {
    this.context = {
      state: 'idle',
      attempt: 0
    };
  }
}
