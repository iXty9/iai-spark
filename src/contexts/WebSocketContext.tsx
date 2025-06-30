
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notification-service';
import { clientManager } from '@/services/supabase/client-manager';

interface WebSocketContextType {
  isConnected: boolean;
  isEnabled: boolean;
  connectionId: string | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  isEnabled: false,
  connectionId: null,
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let proactiveChannel: any = null;
    let toastChannel: any = null;

    const initializeWebSocket = async () => {
      try {
        // Wait for client to be ready
        const isReady = await clientManager.waitForReadiness();
        if (!isReady || !mounted) {
          logger.warn('Client not ready for WebSocket initialization', { module: 'websocket' });
          return;
        }

        logger.info('Initializing WebSocket connections', { module: 'websocket' });
        setIsEnabled(true);

        // Generate a unique connection ID
        const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setConnectionId(connId);

        // Set up the proactive messages channel (for chat messages)
        proactiveChannel = supabase.channel('proactive-messages', {
          config: {
            broadcast: { self: false },
            presence: { key: user?.id || 'anonymous' }
          }
        });

        // Set up the toast notifications channel (for app alerts)
        toastChannel = supabase.channel('toast-notifications', {
          config: {
            broadcast: { self: false },
            presence: { key: user?.id || 'anonymous' }
          }
        });

        // Handle proactive chat messages
        proactiveChannel.on('broadcast', { event: 'proactive_message' }, (payload: { payload: ProactiveMessagePayload }) => {
          if (!mounted) return;
          
          const messageData = payload.payload;
          
          // Check if this message is targeted to current user (or broadcast to all)
          if (messageData.target_user && messageData.target_user !== user?.id) {
            return; // Skip messages not meant for this user
          }

          logger.info('Received proactive message via WebSocket', messageData, { module: 'websocket' });

          // Dispatch custom event for chat components to handle
          window.dispatchEvent(new CustomEvent('proactiveMessage', {
            detail: {
              id: messageData.data.id,
              content: messageData.data.content,
              sender: messageData.data.sender || 'AI Assistant',
              timestamp: messageData.data.timestamp,
              metadata: messageData.data.metadata
            }
          }));
        });

        // Handle toast notifications (separate from chat messages)
        toastChannel.on('broadcast', { event: 'toast_notification' }, (payload: { payload: ToastNotificationPayload }) => {
          if (!mounted) return;
          
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
          notificationService.showNotification(
            notificationData.data.title,
            {
              body: notificationData.data.message,
              icon: '/favicon.ico'
            }
          );
        });

        // Subscribe to both channels
        const proactiveStatus = await proactiveChannel.subscribe();
        const toastStatus = await toastChannel.subscribe();

        if (mounted && proactiveStatus === 'SUBSCRIBED' && toastStatus === 'SUBSCRIBED') {
          setIsConnected(true);
          logger.info('WebSocket channels connected successfully', { 
            connectionId: connId,
            proactiveStatus,
            toastStatus
          }, { module: 'websocket' });
        }

      } catch (error) {
        if (mounted) {
          logger.error('Failed to initialize WebSocket connections', error, { module: 'websocket' });
          setIsConnected(false);
        }
      }
    };

    // Initialize WebSocket when component mounts
    initializeWebSocket();

    // Cleanup function
    return () => {
      mounted = false;
      
      if (proactiveChannel) {
        try {
          supabase.removeChannel(proactiveChannel);
          logger.info('Proactive messages channel disconnected', { module: 'websocket' });
        } catch (error) {
          logger.error('Error disconnecting proactive channel', error, { module: 'websocket' });
        }
      }

      if (toastChannel) {
        try {
          supabase.removeChannel(toastChannel);
          logger.info('Toast notifications channel disconnected', { module: 'websocket' });
        } catch (error) {
          logger.error('Error disconnecting toast channel', error, { module: 'websocket' });
        }
      }

      setIsConnected(false);
      setIsEnabled(false);
      setConnectionId(null);
    };
  }, [user?.id, toast]);

  const value: WebSocketContextType = {
    isConnected,
    isEnabled,
    connectionId,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
