
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { useAuth } from '@/contexts/AuthContext';
import { getAppSettingsMap } from '@/services/admin/settingsService';

interface WebSocketMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  sender?: string;
  metadata?: Record<string, any>;
}

export const useWebSocketConnection = (onMessage?: (message: WebSocketMessage) => void) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check if WebSocket is enabled in settings
  useEffect(() => {
    const checkWebSocketEnabled = async () => {
      try {
        const settings = await getAppSettingsMap();
        const enabled = settings.websocket_enabled === 'true';
        setIsEnabled(enabled);
        
        if (!enabled && channelRef.current) {
          // If disabled, disconnect existing connection
          channelRef.current.unsubscribe();
          channelRef.current = null;
          setIsConnected(false);
        }
      } catch (error) {
        logger.error('Error checking WebSocket enabled setting:', error);
        setIsEnabled(false);
      }
    };

    checkWebSocketEnabled();
    
    // Check settings periodically in case admin changes them
    const interval = setInterval(checkWebSocketEnabled, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only attempt connection if WebSocket is enabled
    if (!isEnabled) {
      return;
    }

    // Initialize WebSocket connection
    const initializeWebSocket = async () => {
      try {
        logger.info('Initializing WebSocket connection for real-time messaging');
        
        const channel = supabase.channel('proactive_messages', {
          config: {
            broadcast: { self: true }
          }
        });

        // Listen for proactive messages targeted at this user
        channel.on('broadcast', { event: 'proactive_message' }, (payload) => {
          const { user_id, message } = payload.payload;
          
          // Only handle messages for the current user
          if (user && user_id === user.id) {
            logger.info('Received proactive message for user', { user_id, message_id: message.id });
            onMessage?.(message);
          }
        });

        // Listen for broadcast messages (sent to all users)
        channel.on('broadcast', { event: 'proactive_message_broadcast' }, (payload) => {
          const { message } = payload.payload;
          logger.info('Received broadcast proactive message', { message_id: message.id });
          onMessage?.(message);
        });

        // Handle connection state changes
        channel.on('presence', { event: 'sync' }, () => {
          logger.info('WebSocket presence synced');
          setIsConnected(true);
        });

        channel.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          logger.info('Received database change via WebSocket', payload);
        });

        // Subscribe to the channel
        const subscription = await channel.subscribe((status) => {
          logger.info('WebSocket subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            logger.info('Successfully connected to WebSocket channel');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('WebSocket channel error');
            setIsConnected(false);
          } else if (status === 'TIMED_OUT') {
            logger.warn('WebSocket connection timed out');
            setIsConnected(false);
          } else if (status === 'CLOSED') {
            logger.info('WebSocket connection closed');
            setIsConnected(false);
          }
        });

        channelRef.current = channel;

        // Track user presence if authenticated
        if (user) {
          const presenceData = {
            user_id: user.id,
            online_at: new Date().toISOString(),
          };
          
          await channel.track(presenceData);
          logger.info('User presence tracked in WebSocket', { user_id: user.id });
        }

      } catch (error) {
        logger.error('Error initializing WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    initializeWebSocket();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        logger.info('Cleaning up WebSocket connection');
        channelRef.current.unsubscribe();
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user, onMessage, isEnabled]);

  const sendMessage = async (message: WebSocketMessage) => {
    if (!channelRef.current || !isConnected || !isEnabled) {
      logger.warn('Cannot send message: WebSocket not connected or not enabled');
      return false;
    }

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'user_message',
        payload: { message }
      });
      
      logger.info('Message sent via WebSocket', { message_id: message.id });
      return true;
    } catch (error) {
      logger.error('Error sending message via WebSocket:', error);
      return false;
    }
  };

  return {
    isConnected: isConnected && isEnabled,
    isEnabled,
    sendMessage,
    disconnect: () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        setIsConnected(false);
      }
    }
  };
};
