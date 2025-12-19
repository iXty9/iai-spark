/**
 * Shared WebSocket types used across the application
 */

// WebSocket connection configuration constants
export const WEBSOCKET_CONFIG = {
  // Timeouts
  CLIENT_READINESS_TIMEOUT_MS: 30000,
  REALTIME_READY_DELAY_MS: 2000,
  CHANNEL_SUBSCRIPTION_TIMEOUT_MS: 15000,
  FORCE_RECONNECT_DELAY_MS: 1000,
  
  // Reconnection
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_RECONNECT_DELAY_MS: 1000,
  
  // Channel names
  CHANNELS: {
    PROACTIVE_MESSAGES: 'proactive-messages',
    TOAST_NOTIFICATIONS: 'toast-notifications',
  },
} as const;

/**
 * Proactive message received from WebSocket
 */
export interface ProactiveMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket connection diagnostics
 */
export interface WebSocketDiagnostics {
  lastConnectionAttempt: string | null;
  connectionAttempts: number;
  lastError: string | null;
  channelsActive: string[];
}

/**
 * WebSocket realtime connection status
 */
export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Status indicator visual configuration
 */
export interface StatusIndicatorConfig {
  color: string;
  tooltip: string;
  status: string;
  variant: 'default' | 'secondary' | 'destructive';
}

/**
 * Helper to safely extract error message from unknown error
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
};
