
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { webSocketConnectionManager, ProactiveMessage } from '@/services/websocket/connection-manager';
import { logger } from '@/utils/logging';

export const useWebSocketConnection = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (authLoading || !user || connectionAttempted) {
      return;
    }

    logger.info('Initializing WebSocket connection for authenticated user', { 
      userId: user.id,
      module: 'websocket-hook' 
    });

    setConnectionAttempted(true);

    const initConnection = async () => {
      const success = await webSocketConnectionManager.connect();
      if (success) {
        logger.info('WebSocket connection initialized successfully', { module: 'websocket-hook' });
      } else {
        logger.warn('Failed to initialize WebSocket connection', { module: 'websocket-hook' });
      }
    };

    initConnection();

    // Subscribe to connection status changes
    const unsubscribeConnection = webSocketConnectionManager.onConnectionChange((connected) => {
      setIsConnected(connected);
      logger.info(`WebSocket connection status changed: ${connected}`, { module: 'websocket-hook' });
    });

    return () => {
      unsubscribeConnection();
      webSocketConnectionManager.disconnect();
      setConnectionAttempted(false);
    };
  }, [user, authLoading, connectionAttempted]);

  // Subscribe to proactive messages
  const onProactiveMessage = useCallback((handler: (message: ProactiveMessage) => void) => {
    return webSocketConnectionManager.onMessage(handler);
  }, []);

  // Manual reconnection function
  const reconnect = useCallback(async () => {
    if (user) {
      logger.info('Manual WebSocket reconnection requested', { module: 'websocket-hook' });
      webSocketConnectionManager.disconnect();
      await webSocketConnectionManager.connect();
    }
  }, [user]);

  return {
    isConnected,
    onProactiveMessage,
    reconnect,
    connectionManager: webSocketConnectionManager
  };
};
