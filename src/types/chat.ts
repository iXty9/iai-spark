
export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  source?: 'user' | 'ai' | 'proactive'; // Added source tracking
  isLoading?: boolean;
  pending?: boolean;
  rawRequest?: any; // Webhook request payload
  rawResponse?: any; // Webhook response payload  
  metadata?: Record<string, any>;
  tokenInfo?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  threadId?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  error?: string | null;
}

export interface TokenInfo {
  threadId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface DebugInfo {
  viewportHeight: number;
  inputVisible: boolean;
  inputPosition: {
    top: number;
    left: number;
    bottom: number;
  };
  messageCount: number;
  isIOSSafari: boolean;
  computedStyles: {
    position: string;
    display: string;
    visibility: string;
    height: string;
    zIndex: string;
    overflow: string;
    transform: string;
    opacity: string;
  };
  parentInfo: {
    overflow: string;
    height: string;
    position: string;
  };
  // Extended with additional debug information
  supabaseInfo?: {
    connectionStatus: string;
    lastConnectionAttempt: string | null;
    connectionLatency: number | null;
    authStatus: string;
    retryCount: number;
    lastError: string | null;
    environment: string | null;
    isInitialized: boolean;
  };
  bootstrapInfo?: {
    stage: string;
    startTime: string | null;
    completionTime: string | null;
    steps: Array<{
      step: string;
      status: string;
      timestamp: string;
      error: string | null;
    }>;
    lastError: string | null;
  };
  environmentInfo?: {
    type: string | null;
    isDevelopment: boolean;
    isProduction: boolean;
    publicVars: Record<string, string>;
  };
  storageInfo?: {
    availableSpace: number | null;
    usedSpace: number | null;
    appKeys: string[];
    errors: string[];
  };
  consoleLogs?: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export interface DebugEvent {
  screen?: string;
  messagesCount?: number;
  isLoading?: boolean;
  hasInteracted?: boolean;
  isTransitioning?: boolean;
  lastAction?: string;
  lastError?: string | null;
  inputState?: string;
  authState?: string;
  timestamp?: string;
}
