import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { notificationService } from '@/services/notification-service';
import { logger } from '@/utils/logging';

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
  onProactiveMessage: (callback: (message: ProactiveMessage) => void) => () => void;
  removeProactiveMessageListener: (callback: (message: ProactiveMessage) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const channelRef = useRef<any>(null);
  const messageHandlersRef = useRef<Set<(message: ProactiveMessage) => void>>(new Set());

  // Load WebSocket settings and connect immediately when enabled
  useEffect(() => {
    const loadSettingsAndConnect = async () => {
      try {
        const settings = await fetchAppSettings();
        // Handle both boolean true and string 'true' by converting to boolean
        const websocketEnabled = Boolean(settings.websocket_enabled === true || settings.websocket_enabled === 'true');
        setIsEnabled(websocketEnabled);
        
        if (websocketEnabled) {
          connectToChannel();
        } else if (!websocketEnabled && channelRef.current) {
          disconnect();
        }
      } catch (error) {
        logger.error('Failed to load WebSocket settings:', error);
        setIsEnabled(false);
      }
    };

    loadSettingsAndConnect();
  }, []); // Remove user dependency - connect immediately when app loads

  const connectToChannel = useCallback(() => {
    if (!isEnabled || channelRef.current) return;

    try {
      const channel = supabase.channel('proactive_messages', {
        config: { presence: { key: 'anonymous' } } // Use anonymous key when no user
      });

      channel
        .on('broadcast', { event: 'proactive_message' }, (payload) => {
          if (payload.payload?.message) {
            logger.info('Received targeted proactive message:', payload.payload.message);
            
            const message: ProactiveMessage = {
              id: payload.payload.message.id,
              content: payload.payload.message.content,
              sender: payload.payload.message.sender || 'System',
              timestamp: payload.payload.message.timestamp,
              metadata: payload.payload.message.metadata
            };
            
            // Use notification service for coordinated notifications
            notificationService.showProactiveMessage(message.content, message.sender);
            
            // Notify all registered handlers
            messageHandlersRef.current.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                logger.error('Error in proactive message handler:', error);
              }
            });
          }
        })
        .on('broadcast', { event: 'proactive_message_broadcast' }, (payload) => {
          if (payload.payload?.message) {
            logger.info('Received broadcast proactive message:', payload.payload.message);
            
            const message: ProactiveMessage = {
              id: payload.payload.message.id,
              content: payload.payload.message.content,
              sender: payload.payload.message.sender || 'System',
              timestamp: payload.payload.message.timestamp,
              metadata: payload.payload.message.metadata
            };
            
            // Use notification service for coordinated notifications
            notificationService.showProactiveMessage(message.content, message.sender);
            
            // Notify all registered handlers
            messageHandlersRef.current.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                logger.error('Error in proactive message handler:', error);
              }
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            logger.info('Connected to proactive messages channel');
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            logger.error('Failed to connect to proactive messages channel');
          }
        });

      channelRef.current = channel;
    } catch (error) {
      logger.error('Error connecting to WebSocket channel:', error);
      setIsConnected(false);
    }
  }, [isEnabled]); // Remove user dependency

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      logger.info('Disconnected from proactive messages channel');
    }
  }, []);

  const onProactiveMessage = useCallback((callback: (message: ProactiveMessage) => void) => {
    messageHandlersRef.current.add(callback);
    return () => {
      messageHandlersRef.current.delete(callback);
    };
  }, []);

  const removeProactiveMessageListener = useCallback((callback: (message: ProactiveMessage) => void) => {
    messageHandlersRef.current.delete(callback);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const contextValue: WebSocketContextType = {
    isConnected,
    isEnabled,
    onProactiveMessage,
    removeProactiveMessageListener
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
