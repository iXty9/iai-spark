
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { supaToast } from '@/services/supa-toast';
import { notificationService } from '@/services/notification-service';
import { notificationCenterService } from '@/services/notification/notification-center-service';
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
  realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onProactiveMessage: (handler: (message: ProactiveMessage) => void) => () => void;
  forceReconnect: () => Promise<void>;
  diagnostics: {
    lastConnectionAttempt: string | null;
    connectionAttempts: number;
    lastError: string | null;
    channelsActive: string[];
  };
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  isEnabled: false,
  connectionId: null,
  realtimeStatus: 'disconnected',
  onProactiveMessage: () => () => {},
  forceReconnect: async () => {},
  diagnostics: {
    lastConnectionAttempt: null as string | null,
    connectionAttempts: 0,
    lastError: null as string | null,
    channelsActive: [] as string[]
  }
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [diagnostics, setDiagnostics] = useState({
    lastConnectionAttempt: null as string | null,
    connectionAttempts: 0,
    lastError: null as string | null,
    channelsActive: [] as string[]
  });
  
  const proactiveMessageHandlersRef = useRef<((message: ProactiveMessage) => void)[]>([]);
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const channelsRef = useRef<{ proactive: any; toast: any }>({ proactive: null, toast: null });
  const initializationRef = useRef(false);

  // Method to subscribe to proactive messages
  const onProactiveMessage = (handler: (message: ProactiveMessage) => void) => {
    proactiveMessageHandlersRef.current.push(handler);
    
    return () => {
      proactiveMessageHandlersRef.current = proactiveMessageHandlersRef.current.filter(h => h !== handler);
    };
  };

  // Update diagnostics helper
  const updateDiagnostics = (updates: Partial<typeof diagnostics>) => {
    setDiagnostics(prev => ({ ...prev, ...updates }));
  };

  // Connection retry logic with improved tracking
  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', null, { module: 'websocket' });
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: 'Max reconnection attempts reached' });
      return;
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
    reconnectAttemptsRef.current++;

    logger.info(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current})`, null, { module: 'websocket' });
    updateDiagnostics({ lastError: `Reconnection attempt ${reconnectAttemptsRef.current} scheduled` });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isEnabled) {
        initializeWebSocket();
      }
    }, delay);
  };

  // Cleanup function
  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clean up channels
    if (channelsRef.current.proactive) {
      supabase.removeChannel(channelsRef.current.proactive);
      channelsRef.current.proactive = null;
    }
    if (channelsRef.current.toast) {
      supabase.removeChannel(channelsRef.current.toast);
      channelsRef.current.toast = null;
    }
    
    updateDiagnostics({ channelsActive: [] });
  };

  // Force reconnect function
  const forceReconnect = async () => {
    logger.info('Force reconnecting WebSocket...', { module: 'websocket' });
    
    setRealtimeStatus('connecting');
    cleanup();
    reconnectAttemptsRef.current = 0;
    
    // Force reconnect the client manager's realtime connection
    const realtimeReconnected = await clientManager.forceReconnectRealtime();
    
    if (realtimeReconnected) {
      // Wait a bit then reinitialize
      setTimeout(() => {
        initializeWebSocket();
      }, 1000);
    } else {
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: 'Force reconnect failed' });
    }
  };

  const initializeWebSocket = async () => {
    try {
      updateDiagnostics({ 
        lastConnectionAttempt: new Date().toISOString(),
        connectionAttempts: diagnostics.connectionAttempts + 1 
      });
      
      setRealtimeStatus('connecting');
      
      // Wait for client to be ready with timeout
      logger.info('Waiting for client readiness...', { module: 'websocket' });
      const isReady = await Promise.race([
        clientManager.waitForReadiness(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 30000))
      ]);
      
      if (!isReady) {
        throw new Error('Client readiness timeout after 30 seconds');
      }

      // Additional wait to ensure realtime is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if realtime is actually connected
      if (!clientManager.isRealtimeConnected()) {
        logger.warn('Realtime not connected, attempting to establish connection...', { module: 'websocket' });
        const reconnected = await clientManager.forceReconnectRealtime();
        if (!reconnected) {
          throw new Error('Failed to establish realtime connection');
        }
      }

      logger.info('Initializing WebSocket channels...', { module: 'websocket' });
      setIsEnabled(true);

      // Generate a unique connection ID
      const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConnectionId(connId);

      // Set up channels with enhanced error handling using consistent channel names
      const proactiveChannel = supabase.channel('proactive-messages', {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'anonymous' }
        }
      });

      const toastChannel = supabase.channel('toast-notifications', {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'anonymous' }
        }
      });

      // Store channel references
      channelsRef.current.proactive = proactiveChannel;
      channelsRef.current.toast = toastChannel;

      // Handle proactive chat messages with improved payload processing
      proactiveChannel.on('broadcast', { event: 'proactive_message' }, (payload: any) => {
        logger.info('Raw proactive message payload received:', payload, { module: 'websocket' });
        
        // Handle the payload structure from edge function
        const messagePayload = payload.payload; // Supabase wraps in payload
        
        // Check if this message is targeted to current user (or broadcast to all)
        if (messagePayload?.target_user && messagePayload.target_user !== user?.id) {
          logger.debug('Skipping proactive message not for this user', { target: messagePayload.target_user, current: user?.id }, { module: 'websocket' });
          return;
        }

        if (messagePayload?.data) {
          logger.info('Processing proactive message:', messagePayload.data, { module: 'websocket' });

          // Create ProactiveMessage object from the corrected data structure
          const proactiveMessage: ProactiveMessage = {
            id: messagePayload.data.id,
            content: messagePayload.data.content, // Now using 'content' field
            sender: messagePayload.data.sender || 'AI Assistant',
            timestamp: messagePayload.data.timestamp,
            metadata: messagePayload.data.metadata
          };

          logger.info('Created proactive message object:', proactiveMessage, { module: 'websocket' });

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
        } else {
          logger.warn('Received proactive message with unexpected structure:', messagePayload, { module: 'websocket' });
        }
      });

      // Handle toast notifications with improved payload processing
      toastChannel.on('broadcast', { event: 'toast_notification' }, (payload: any) => {
        logger.info('Raw toast notification payload received:', payload, { module: 'websocket' });
        
        // Handle the payload structure from edge function
        const notificationPayload = payload.payload; // Supabase wraps in payload
        
        // Check if this notification is targeted to current user (or broadcast to all)
        if (notificationPayload?.target_user && notificationPayload.target_user !== user?.id) {
          logger.debug('Skipping toast notification not for this user', { target: notificationPayload.target_user, current: user?.id }, { module: 'websocket' });
          return;
        }

        if (notificationPayload?.data) {
          logger.info('Processing toast notification:', notificationPayload.data, { module: 'websocket' });

          // Use supa-toast service for unified toast handling (no database storage on client-side)
          supaToast.handleWebSocketToast({
            title: notificationPayload.data.title,
            message: notificationPayload.data.message,
            type: notificationPayload.data.type,
            metadata: {
              source: 'websocket',
              timestamp: new Date().toISOString()
            }
          });

          // Note: Database storage is now handled server-side in the toast-notification-webhook
          // This eliminates duplicate entries when same user has multiple browser instances
        } else {
          logger.warn('Received toast notification with unexpected structure:', notificationPayload, { module: 'websocket' });
        }
      });

      // Subscribe with enhanced error handling and timeouts
      try {
        logger.info('Subscribing to channels...', { module: 'websocket' });
        
        const subscriptionPromises = [
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Proactive channel subscription timeout')), 15000);
            proactiveChannel.subscribe((status) => {
              clearTimeout(timeout);
              resolve(status);
            });
          }),
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Toast channel subscription timeout')), 15000);
            toastChannel.subscribe((status) => {
              clearTimeout(timeout);
              resolve(status);
            });
          })
        ];

        const results = await Promise.all(subscriptionPromises);
        logger.info('Channel subscription results:', results, { module: 'websocket' });

        const [proactiveResult, toastResult] = results;
        const proactiveSuccess = proactiveResult === 'SUBSCRIBED';
        const toastSuccess = toastResult === 'SUBSCRIBED';

        if (proactiveSuccess && toastSuccess) {
          setIsConnected(true);
          setRealtimeStatus('connected');
          reconnectAttemptsRef.current = 0;
          updateDiagnostics({ 
            lastError: null,
            channelsActive: ['proactive-messages', 'toast-notifications']
          });
          logger.info('WebSocket channels connected successfully', { 
            connectionId: connId,
            module: 'websocket' 
          });
        } else {
          throw new Error(`Channel subscription failed: proactive=${proactiveResult}, toast=${toastResult}`);
        }
      } catch (subscriptionError) {
        logger.error('Channel subscription error:', subscriptionError, { module: 'websocket' });
        setIsConnected(false);
        setRealtimeStatus('error');
        updateDiagnostics({ lastError: subscriptionError.message });
        scheduleReconnect();
        return;
      }

    } catch (error) {
      logger.error('Failed to initialize WebSocket connections', error, { module: 'websocket' });
      setIsConnected(false);
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: error.message });
      scheduleReconnect();
    }
  };

  useEffect(() => {
    let mounted = true;

    // Prevent multiple initializations
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    const init = async () => {
      if (mounted) {
        await initializeWebSocket();
      }
    };

    init();

    return () => {
      mounted = false;
      initializationRef.current = false;
      cleanup();
      setIsConnected(false);
      setIsEnabled(false);
      setConnectionId(null);
      setRealtimeStatus('disconnected');
    };
  }, [user?.id]);

  const value: WebSocketContextType = {
    isConnected,
    isEnabled,
    connectionId,
    realtimeStatus,
    onProactiveMessage,
    forceReconnect,
    diagnostics,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
