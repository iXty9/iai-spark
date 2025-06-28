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

// Mobile Safari detection
const isMobileSafari = () => {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) && 
         /^((?!chrome|android).)*safari/i.test(userAgent);
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const channelRef = useRef<any>(null);
  const messageHandlersRef = useRef<Set<(message: ProactiveMessage) => void>>(new Set());
  
  // Message deduplication - track processed message IDs
  const processedMessageIds = useRef<Set<string>>(new Set());
  const messageProcessingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup processed message IDs periodically to prevent memory leaks
  const cleanupProcessedMessages = useCallback(() => {
    // Keep only the last 100 message IDs to prevent memory growth
    if (processedMessageIds.current.size > 100) {
      const idsArray = Array.from(processedMessageIds.current);
      const toKeep = idsArray.slice(-50); // Keep last 50
      processedMessageIds.current = new Set(toKeep);
      
      logger.info('Cleaned up processed message IDs', { 
        previousCount: idsArray.length, 
        currentCount: processedMessageIds.current.size,
        module: 'websocket-mobile'
      });
    }
  }, []);

  // Enhanced message processing with deduplication
  const processProactiveMessage = useCallback((payload: any, eventType: string) => {
    if (!payload?.message) return;

    const message: ProactiveMessage = {
      id: payload.message.id,
      content: payload.message.content,
      sender: payload.message.sender || 'System',
      timestamp: payload.message.timestamp,
      metadata: payload.message.metadata
    };

    // Check for duplicate message processing
    if (processedMessageIds.current.has(message.id)) {
      logger.warn('Duplicate message detected and prevented', { 
        messageId: message.id,
        eventType,
        isMobile: isMobileSafari(),
        module: 'websocket-mobile'
      });
      return;
    }

    // Mark message as being processed
    processedMessageIds.current.add(message.id);

    logger.info(`Processing ${eventType} proactive message`, {
      messageId: message.id,
      sender: message.sender,
      isMobile: isMobileSafari(),
      module: 'websocket-mobile'
    });

    // Mobile Safari specific handling with delay
    if (isMobileSafari()) {
      // Clear any existing timeout for this message
      const existingTimeout = messageProcessingTimeouts.current.get(message.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add a small delay for mobile Safari to ensure proper state handling
      const timeout = setTimeout(() => {
        try {
          // Use notification service for coordinated notifications
          notificationService.showProactiveMessage(message.content, message.sender);
          
          // Notify all registered handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              logger.error('Error in mobile proactive message handler:', error, { 
                messageId: message.id,
                module: 'websocket-mobile'
              });
            }
          });
          
          logger.info('Mobile Safari message processing completed', {
            messageId: message.id,
            handlerCount: messageHandlersRef.current.size,
            module: 'websocket-mobile'
          });
        } catch (error) {
          logger.error('Error processing mobile Safari message:', error, {
            messageId: message.id,
            module: 'websocket-mobile'
          });
        } finally {
          messageProcessingTimeouts.current.delete(message.id);
        }
      }, 100); // 100ms delay for mobile Safari

      messageProcessingTimeouts.current.set(message.id, timeout);
    } else {
      // Desktop processing - immediate
      try {
        notificationService.showProactiveMessage(message.content, message.sender);
        
        messageHandlersRef.current.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            logger.error('Error in desktop proactive message handler:', error, {
              messageId: message.id,
              module: 'websocket-desktop'
            });
          }
        });
      } catch (error) {
        logger.error('Error processing desktop message:', error, {
          messageId: message.id,
          module: 'websocket-desktop'
        });
      }
    }

    // Cleanup old processed messages
    cleanupProcessedMessages();
  }, [cleanupProcessedMessages]);

  // Load WebSocket settings and connect immediately when enabled
  useEffect(() => {
    const loadSettingsAndConnect = async () => {
      try {
        const settings = await fetchAppSettings();
        const websocketEnabled = String(settings.websocket_enabled).toLowerCase() === 'true';
        setIsEnabled(websocketEnabled);
        
        if (websocketEnabled) {
          connectToChannel(websocketEnabled);
        } else if (!websocketEnabled && channelRef.current) {
          disconnect();
        }
      } catch (error) {
        logger.error('Failed to load WebSocket settings:', error);
        setIsEnabled(false);
      }
    };

    loadSettingsAndConnect();
  }, []);

  const connectToChannel = useCallback((websocketEnabled: boolean) => {
    if (!websocketEnabled || channelRef.current) return;

    try {
      const channel = supabase.channel('proactive_messages', {
        config: { presence: { key: 'anonymous' } }
      });

      channel
        .on('broadcast', { event: 'proactive_message' }, (payload) => {
          processProactiveMessage(payload.payload, 'targeted');
        })
        .on('broadcast', { event: 'proactive_message_broadcast' }, (payload) => {
          processProactiveMessage(payload.payload, 'broadcast');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            logger.info('Connected to proactive messages channel', {
              isMobile: isMobileSafari(),
              module: 'websocket'
            });
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
  }, [processProactiveMessage]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      logger.info('Disconnected from proactive messages channel');
    }

    // Clear any pending timeouts
    messageProcessingTimeouts.current.forEach(timeout => clearTimeout(timeout));
    messageProcessingTimeouts.current.clear();
  }, []);

  const onProactiveMessage = useCallback((callback: (message: ProactiveMessage) => void) => {
    messageHandlersRef.current.add(callback);
    
    logger.info('Added proactive message handler', {
      totalHandlers: messageHandlersRef.current.size,
      isMobile: isMobileSafari(),
      module: 'websocket'
    });
    
    return () => {
      messageHandlersRef.current.delete(callback);
      logger.info('Removed proactive message handler', {
        totalHandlers: messageHandlersRef.current.size,
        module: 'websocket'
      });
    };
  }, []);

  const removeProactiveMessageListener = useCallback((callback: (message: ProactiveMessage) => void) => {
    messageHandlersRef.current.delete(callback);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      // Clear processed message IDs
      processedMessageIds.current.clear();
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
