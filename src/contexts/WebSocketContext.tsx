
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { supaToast } from '@/services/supa-toast';
import { ToastType } from '@/services/supa-toast/types';
import { clientManager } from '@/services/supabase/client-manager';
import { 
  ProactiveMessage, 
  WebSocketDiagnostics, 
  RealtimeStatus, 
  WEBSOCKET_CONFIG,
  getErrorMessage 
} from '@/types/websocket';

// Re-export for backwards compatibility
export type { ProactiveMessage } from '@/types/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  isEnabled: boolean;
  connectionId: string | null;
  realtimeStatus: RealtimeStatus;
  onProactiveMessage: (handler: (message: ProactiveMessage) => void) => () => void;
  forceReconnect: () => Promise<void>;
  diagnostics: WebSocketDiagnostics;
}

const defaultDiagnostics: WebSocketDiagnostics = {
  lastConnectionAttempt: null,
  connectionAttempts: 0,
  lastError: null,
  channelsActive: []
};

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  isEnabled: false,
  connectionId: null,
  realtimeStatus: 'disconnected',
  onProactiveMessage: () => () => {},
  forceReconnect: async () => {},
  diagnostics: defaultDiagnostics
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('disconnected');
  const [diagnostics, setDiagnostics] = useState<WebSocketDiagnostics>(defaultDiagnostics);
  
  const proactiveMessageHandlersRef = useRef<((message: ProactiveMessage) => void)[]>([]);
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const channelsRef = useRef<{ proactive: RealtimeChannel | null; toast: RealtimeChannel | null }>({ 
    proactive: null, 
    toast: null 
  });
  const initializationRef = useRef(false);

  // Method to subscribe to proactive messages
  const onProactiveMessage = useCallback((handler: (message: ProactiveMessage) => void) => {
    proactiveMessageHandlersRef.current.push(handler);
    
    return () => {
      proactiveMessageHandlersRef.current = proactiveMessageHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  // Update diagnostics helper with functional update to avoid stale closures
  const updateDiagnostics = useCallback((updates: Partial<WebSocketDiagnostics>) => {
    setDiagnostics(prev => ({ ...prev, ...updates }));
  }, []);

  // Connection retry logic with improved tracking
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached', null, { module: 'websocket' });
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: 'Max reconnection attempts reached' });
      return;
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * WEBSOCKET_CONFIG.BASE_RECONNECT_DELAY_MS;
    reconnectAttemptsRef.current++;

    logger.info(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current})`, null, { module: 'websocket' });
    updateDiagnostics({ lastError: `Reconnection attempt ${reconnectAttemptsRef.current} scheduled` });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isEnabled) {
        initializeWebSocket();
      }
    }, delay);
  }, [isEnabled, updateDiagnostics]);

  // Cleanup function
  const cleanup = useCallback(() => {
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
  }, [updateDiagnostics]);

  // Force reconnect function
  const forceReconnect = useCallback(async () => {
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
      }, WEBSOCKET_CONFIG.FORCE_RECONNECT_DELAY_MS);
    } else {
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: 'Force reconnect failed' });
    }
  }, [cleanup, updateDiagnostics]);

  const initializeWebSocket = async () => {
    try {
      // Use functional update to get accurate connection attempts count
      setDiagnostics(prev => ({ 
        ...prev,
        lastConnectionAttempt: new Date().toISOString(),
        connectionAttempts: prev.connectionAttempts + 1 
      }));
      
      setRealtimeStatus('connecting');
      
      // Wait for client to be ready with timeout
      logger.debug('Waiting for client readiness...', { module: 'websocket' });
      const isReady = await Promise.race([
        clientManager.waitForReadiness(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), WEBSOCKET_CONFIG.CLIENT_READINESS_TIMEOUT_MS))
      ]);
      
      if (!isReady) {
        throw new Error(`Client readiness timeout after ${WEBSOCKET_CONFIG.CLIENT_READINESS_TIMEOUT_MS / 1000} seconds`);
      }

      // Additional wait to ensure realtime is ready
      await new Promise(resolve => setTimeout(resolve, WEBSOCKET_CONFIG.REALTIME_READY_DELAY_MS));

      // Check if realtime is actually connected
      if (!clientManager.isRealtimeConnected()) {
        logger.warn('Realtime not connected, attempting to establish connection...', { module: 'websocket' });
        const reconnected = await clientManager.forceReconnectRealtime();
        if (!reconnected) {
          throw new Error('Failed to establish realtime connection');
        }
      }

      logger.debug('Initializing WebSocket channels...', { module: 'websocket' });
      setIsEnabled(true);

      // Generate a unique connection ID using substring (not deprecated substr)
      const connId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      setConnectionId(connId);

      // Set up channels - NO presence config (causes channel type mismatch with edge function)
      const proactiveChannel = supabase.channel(WEBSOCKET_CONFIG.CHANNELS.PROACTIVE_MESSAGES, {
        config: {
          broadcast: { self: false }
        }
      });

      const toastChannel = supabase.channel(WEBSOCKET_CONFIG.CHANNELS.TOAST_NOTIFICATIONS, {
        config: {
          broadcast: { self: false }
        }
      });

      // Store channel references
      channelsRef.current.proactive = proactiveChannel;
      channelsRef.current.toast = toastChannel;

      // Handle proactive chat messages with improved payload processing
      proactiveChannel.on('broadcast', { event: 'proactive_message' }, (payload: { payload?: { target_user?: string; data?: { id: string; content: string; sender?: string; timestamp: string; metadata?: Record<string, unknown> }; is_broadcast?: boolean } }) => {
        logger.debug('Raw proactive broadcast received', payload, { module: 'websocket' });
        
        // Handle the payload structure from edge function
        const messagePayload = payload.payload; // Supabase wraps in payload
        
        // Check if this message is targeted to current user (or broadcast to all)
        if (messagePayload?.target_user && messagePayload.target_user !== user?.id) {
          logger.debug('Skipping proactive message not for this user', { target: messagePayload.target_user, current: user?.id }, { module: 'websocket' });
          return;
        }

        if (messagePayload?.data) {
          logger.debug('Processing proactive message for user', { userId: user?.id }, { module: 'websocket' });
          logger.info('Processing proactive message:', messagePayload.data, { module: 'websocket' });

          // Create ProactiveMessage object from the corrected data structure
          const proactiveMessage: ProactiveMessage = {
            id: messagePayload.data.id,
            content: messagePayload.data.content,
            sender: messagePayload.data.sender || 'AI Assistant',
            timestamp: messagePayload.data.timestamp,
            metadata: messagePayload.data.metadata
          };

          logger.debug('Created proactive message object', proactiveMessage, { module: 'websocket' });

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
      toastChannel.on('broadcast', { event: 'toast_notification' }, (payload: { payload?: { target_user?: string; data?: { title: string; message: string; type?: ToastType; metadata?: Record<string, unknown> } } }) => {
        logger.debug('Raw toast notification payload received', payload, { module: 'websocket' });
        
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
        logger.debug('Subscribing to channels...', { module: 'websocket' });
        
        const subscriptionPromises = [
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Proactive channel subscription timeout')), WEBSOCKET_CONFIG.CHANNEL_SUBSCRIPTION_TIMEOUT_MS);
            proactiveChannel.subscribe((status) => {
              clearTimeout(timeout);
              resolve(status);
            });
          }),
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Toast channel subscription timeout')), WEBSOCKET_CONFIG.CHANNEL_SUBSCRIPTION_TIMEOUT_MS);
            toastChannel.subscribe((status) => {
              clearTimeout(timeout);
              resolve(status);
            });
          })
        ];

        const results = await Promise.all(subscriptionPromises);
        logger.debug('Channel subscription results', results, { module: 'websocket' });

        const [proactiveResult, toastResult] = results;
        logger.debug('Proactive channel subscribed', { result: proactiveResult, userId: user?.id }, { module: 'websocket' });
        logger.debug('Toast channel subscribed', { result: toastResult }, { module: 'websocket' });
        
        const proactiveSuccess = proactiveResult === 'SUBSCRIBED';
        const toastSuccess = toastResult === 'SUBSCRIBED';

        if (proactiveSuccess && toastSuccess) {
          logger.info('Both WebSocket channels SUBSCRIBED - ready to receive messages', { module: 'websocket' });
          setIsConnected(true);
          setRealtimeStatus('connected');
          reconnectAttemptsRef.current = 0;
          updateDiagnostics({ 
            lastError: null,
            channelsActive: [WEBSOCKET_CONFIG.CHANNELS.PROACTIVE_MESSAGES, WEBSOCKET_CONFIG.CHANNELS.TOAST_NOTIFICATIONS]
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
        updateDiagnostics({ lastError: getErrorMessage(subscriptionError) });
        scheduleReconnect();
        return;
      }

    } catch (error) {
      logger.error('Failed to initialize WebSocket connections', error, { module: 'websocket' });
      setIsConnected(false);
      setRealtimeStatus('error');
      updateDiagnostics({ lastError: getErrorMessage(error) });
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
