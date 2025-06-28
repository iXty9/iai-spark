
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';
import { notificationService } from '@/services/notification-service';

export interface WebSocketMessage {
  id: string;
  content: string;
  sender?: string;
  timestamp: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface ProactiveMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const useWebSocketConnection = (onMessage?: (message: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const messageCallbackRef = useRef(onMessage);

  // Update the callback ref when onMessage changes
  useEffect(() => {
    messageCallbackRef.current = onMessage;
  }, [onMessage]);

  // Load WebSocket settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchAppSettings();
        const websocketEnabled = settings.websocket_enabled === 'true';
        setIsEnabled(websocketEnabled);
        
        if (websocketEnabled && user) {
          connectToChannel();
        } else if (!websocketEnabled && channelRef.current) {
          disconnect();
        }
      } catch (error) {
        logger.error('Failed to load WebSocket settings:', error);
        setIsEnabled(false);
      }
    };

    loadSettings();
  }, [user]);

  const connectToChannel = useCallback(() => {
    if (!user || !isEnabled || channelRef.current) return;

    try {
      const channel = supabase.channel('proactive_messages', {
        config: { presence: { key: user.id } }
      });

      channel
        .on('broadcast', { event: 'proactive_message' }, (payload) => {
          if (payload.payload?.user_id === user.id && payload.payload?.message) {
            logger.info('Received targeted proactive message:', payload.payload.message);
            
            // Use notification service for coordinated notifications
            notificationService.showProactiveMessage(
              payload.payload.message.content,
              payload.payload.message.sender
            );
            
            if (messageCallbackRef.current) {
              messageCallbackRef.current(payload.payload.message);
            }
          }
        })
        .on('broadcast', { event: 'proactive_message_broadcast' }, (payload) => {
          if (payload.payload?.message) {
            logger.info('Received broadcast proactive message:', payload.payload.message);
            
            // Use notification service for coordinated notifications
            notificationService.showProactiveMessage(
              payload.payload.message.content,
              payload.payload.message.sender
            );
            
            if (messageCallbackRef.current) {
              messageCallbackRef.current(payload.payload.message);
            }
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
  }, [user, isEnabled]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      logger.info('Disconnected from proactive messages channel');
    }
  }, []);

  const sendMessage = useCallback(async (message: WebSocketMessage): Promise<boolean> => {
    if (!channelRef.current || !isConnected) {
      logger.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const response = await channelRef.current.send({
        type: 'broadcast',
        event: 'user_message',
        payload: message
      });
      
      return response === 'ok';
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
      return false;
    }
  }, [isConnected]);

  const onProactiveMessage = useCallback((callback: (message: ProactiveMessage) => void) => {
    messageCallbackRef.current = callback;
    return () => {
      messageCallbackRef.current = undefined;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isEnabled,
    sendMessage,
    disconnect,
    onProactiveMessage
  };
};
