
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notification-service';
import { clientManager } from '@/services/supabase/client-manager';

export interface ProactiveMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface WebSocketContextType {
  isConnected: boolean;
  isEnabled: boolean;
  connectionId: string | null;
  onProactiveMessage: (handler: (message: ProactiveMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  isEnabled: false,
  connectionId: null,
  onProactiveMessage: () => () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

interface ToastNotificationPayload {
  type: 'toast_notification';
  data: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
  };
  target_user?: string;
}

interface ProactiveMessagePayload {
  type: 'proactive_message';
  data: {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    metadata?: Record<string, any>;
  };
  target_user?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const proactiveMessageHandlersRef = useRef<((message: ProactiveMessage) => void)[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Method to subscribe to proactive messages
  const onProactiveMessage = (handler: (message: ProactiveMessage) => void) => {
    proactiveMessageHandlersRef.current.push(handler);
    
    return () => {
      proactiveMessageHandlersRef.current = proactiveMessageHandlersRef.current.filter(h => h !== handler);
    };
  };

  // Connection retry logic with exponential backoff
  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', null, { module: 'websocket' });
      return;
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
    reconnectAttemptsRef.current++;

    logger.info(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current})`, null, { module: 'websocket' });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isEnabled) {
        initializeWebSocket();
      }
    }, delay);
  };

  // Health monitoring with ping/pong
  const startHealthMonitoring = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (isConnected) {
        logger.debug('WebSocket health check - connection active', null, { module: 'websocket' });
      } else {
        logger.warn('WebSocket health check - connection inactive, attempting reconnect', null, { module: 'websocket' });
        if (isEnabled) {
          scheduleReconnect();
        }
      }
    }, 30000); // Check every 30 seconds
  };

  // Cleanup function
  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const initializeWebSocket = async () => {
    try {
      // Wait for client to be ready
      const isReady = await clientManager.waitForReadiness();
      if (!isReady) {
        logger.warn('Client not ready for WebSocket initialization', { module: 'websocket' });
        scheduleReconnect();
        return;
      }

      logger.info('Initializing WebSocket connections', { module: 'websocket' });
      setIsEnabled(true);

      // Generate a unique connection ID
      const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConnectionId(connId);

      // Set up the proactive messages channel (for chat messages)
      const proactiveChannel = supabase.channel('proactive-messages', {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'anonymous' }
        }
      });

      // Set up the toast notifications channel (for app alerts)
      const toastChannel = supabase.channel('toast-notifications', {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'anonymous' }
        }
      });

      // Handle proactive chat messages
      proactiveChannel.on('broadcast', { event: 'proactive_message' }, (payload: { payload: ProactiveMessagePayload }) => {
        const messageData = payload.payload;
        
        // Check if this message is targeted to current user (or broadcast to all)
        if (messageData.target_user && messageData.target_user !== user?.id) {
          return; // Skip messages not meant for this user
        }

        logger.info('Received proactive message via WebSocket', messageData, { module: 'websocket' });

        // Create ProactiveMessage object
        const proactiveMessage: ProactiveMessage = {
          id: messageData.data.id,
          content: messageData.data.content,
          sender: messageData.data.sender || 'AI Assistant',
          timestamp: messageData.data.timestamp,
          metadata: messageData.data.metadata
        };

        // Notify all registered handlers
        proactiveMessageHandlersRef.current.forEach(handler => {
          try {
            handler(proactiveMessage);
          } catch (error) {
            logger.error('Error in proactive message handler:', error, { module: 'websocket' });
          }
        });

        // Also dispatch custom event for backwards compatibility
        window.dispatchEvent(new CustomEvent('proactiveMessage', {
          detail: proactiveMessage
        }));
      });

      // Handle toast notifications (separate from chat messages)
      toastChannel.on('broadcast', { event: 'toast_notification' }, (payload: { payload: ToastNotificationPayload }) => {
        const notificationData = payload.payload;
        
        // Check if this notification is targeted to current user (or broadcast to all)
        if (notificationData.target_user && notificationData.target_user !== user?.id) {
          return; // Skip notifications not meant for this user
        }

        logger.info('Received toast notification via WebSocket', notificationData, { module: 'websocket' });

        // Show toast notification
        const toastVariant = notificationData.data.type === 'error' ? 'destructive' : 'default';
        
        toast({
          title: notificationData.data.title,
          description: notificationData.data.message,
          variant: toastVariant,
        });

        // Also trigger browser notification if permission granted
        notificationService.showNotification({
          title: notificationData.data.title,
          message: notificationData.data.message,
          type: notificationData.data.type,
          showBrowserNotification: true
        });
      });

      // Subscribe to both channels with proper status checking
      const proactiveResult = await proactiveChannel.subscribe();
      const toastResult = await toastChannel.subscribe();

      // Check subscription status correctly - the result is an object with status property
      const proactiveStatus = proactiveResult.status || proactiveResult;
      const toastStatus = toastResult.status || toastResult;

      logger.info('Channel subscription results', { 
        proactiveResult,
        toastResult,
        proactiveStatus,
        toastStatus
      }, { module: 'websocket' });

      if (proactiveStatus === 'SUBSCRIBED' && toastStatus === 'SUBSCRIBED') {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        startHealthMonitoring();
        logger.info('WebSocket channels connected successfully', { 
          connectionId: connId,
          proactiveStatus,
          toastStatus
        }, { module: 'websocket' });
      } else {
        throw new Error(`Channel subscription failed: proactive=${proactiveStatus}, toast=${toastStatus}`);
      }

      // Cleanup function
      return () => {
        try {
          supabase.removeChannel(proactiveChannel);
          supabase.removeChannel(toastChannel);
          logger.info('WebSocket channels disconnected', { module: 'websocket' });
        } catch (error) {
          logger.error('Error disconnecting channels', error, { module: 'websocket' });
        }
      };

    } catch (error) {
      logger.error('Failed to initialize WebSocket connections', error, { module: 'websocket' });
      setIsConnected(false);
      scheduleReconnect();
    }
  };

  useEffect(() => {
    let mounted = true;
    let cleanupFn: (() => void) | undefined;

    // Initialize WebSocket when component mounts
    const init = async () => {
      if (mounted) {
        cleanupFn = await initializeWebSocket();
      }
    };

    init();

    // Cleanup function
    return () => {
      mounted = false;
      cleanup();
      
      if (cleanupFn) {
        cleanupFn();
      }

      setIsConnected(false);
      setIsEnabled(false);
      setConnectionId(null);
    };
  }, [user?.id]);

  const value: WebSocketContextType = {
    isConnected,
    isEnabled,
    connectionId,
    onProactiveMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
