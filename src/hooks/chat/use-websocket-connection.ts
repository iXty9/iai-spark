
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { webSocketConnectionManager, ProactiveMessage } from '@/services/websocket/connection-manager';
import { logger } from '@/utils/logging';

export const useWebSocketConnection = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // TEMPORARILY DISABLE WebSocket connections until backend is ready
  const WEBSOCKET_ENABLED = false; // Set to true when backend is ready

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (!WEBSOCKET_ENABLED) {
      logger.info('WebSocket connections disabled - backend not ready', { module: 'websocket-hook' });
      return;
    }

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
  }, [user, authLoading, connectionAttempted, WEBSOCKET_ENABLED]);

  // Subscribe to proactive messages
  const onProactiveMessage = useCallback((handler: (message: ProactiveMessage) => void) => {
    if (!WEBSOCKET_ENABLED) {
      return () => {}; // Return empty unsubscribe function
    }
    return webSocketConnectionManager.onMessage(handler);
  }, [WEBSOCKET_ENABLED]);

  // Manual reconnection function
  const reconnect = useCallback(async () => {
    if (!WEBSOCKET_ENABLED) {
      logger.info('WebSocket reconnection skipped - feature disabled', { module: 'websocket-hook' });
      return;
    }
    if (user) {
      logger.info('Manual WebSocket reconnection requested', { module: 'websocket-hook' });
      webSocketConnectionManager.disconnect();
      await webSocketConnectionManager.connect();
    }
  }, [user, WEBSOCKET_ENABLED]);

  return {
    isConnected: WEBSOCKET_ENABLED ? isConnected : false,
    onProactiveMessage,
    reconnect,
    connectionManager: webSocketConnectionManager
  };
};
