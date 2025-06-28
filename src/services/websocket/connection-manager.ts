
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';

export interface ProactiveMessage {
  id: string;
  type: 'proactive' | 'broadcast';
  content: string;
  sender: 'ai';
  timestamp: string;
  source: 'proactive';
}

export interface WebSocketMessage {
  type: 'connection_established' | 'proactive_message' | 'broadcast_message' | 'ping' | 'pong';
  sessionId?: string;
  userId?: string;
  timestamp: string;
  message?: ProactiveMessage;
}

class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private pingInterval: number | null = null;
  private messageHandlers: ((message: ProactiveMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor() {
    this.setupConnectionHealthCheck();
  }

  async connect(): Promise<boolean> {
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        logger.warn('No active session for WebSocket connection', { module: 'websocket' });
        return false;
      }

      const wsUrl = `wss://ymtdtzkskjdqlzhjuesk.functions.supabase.co/proactive-chat-websocket`;
      
      this.ws = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdGR0emtza2pkcWx6aGp1ZXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjUyNDYsImV4cCI6MjA2MDUwMTI0Nn0.sOQdxH63edhcIgjx6mxjHkeam4IQGViaWYLdFDepIaE'
        }
      } as any);

      this.ws.onopen = () => {
        logger.info('WebSocket connection established', { module: 'websocket' });
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startPingInterval();
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error, { module: 'websocket' });
        }
      };

      this.ws.onclose = () => {
        logger.info('WebSocket connection closed', { module: 'websocket' });
        this.cleanup();
        this.notifyConnectionHandlers(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error, { module: 'websocket' });
      };

      return true;
    } catch (error) {
      logger.error('Failed to establish WebSocket connection:', error, { module: 'websocket' });
      return false;
    }
  }

  private handleMessage(data: WebSocketMessage) {
    logger.info('Received WebSocket message:', data, { module: 'websocket' });

    switch (data.type) {
      case 'connection_established':
        logger.info('WebSocket connection confirmed', { 
          sessionId: data.sessionId,
          userId: data.userId,
          module: 'websocket' 
        });
        break;

      case 'proactive_message':
      case 'broadcast_message':
        if (data.message) {
          this.notifyMessageHandlers(data.message);
        }
        break;

      case 'pong':
        // Connection health confirmed
        break;

      default:
        logger.warn('Unknown WebSocket message type:', data.type, { module: 'websocket' });
    }
  }

  private setupConnectionHealthCheck() {
    // Start ping interval when connection is established
  }

  private startPingInterval() {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', { module: 'websocket' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`, { module: 'websocket' });

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Subscribe to proactive messages
  onMessage(handler: (message: ProactiveMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  // Subscribe to connection status changes
  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  private notifyMessageHandlers(message: ProactiveMessage) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Error in message handler:', error, { module: 'websocket' });
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        logger.error('Error in connection handler:', error, { module: 'websocket' });
      }
    });
  }
}

// Export singleton instance
export const webSocketConnectionManager = new WebSocketConnectionManager();
