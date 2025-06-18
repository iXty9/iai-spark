
/**
 * Global type definitions for window objects and debug state
 */

export interface DebugState {
  screen: string;
  messagesCount: number;
  isLoading: boolean;
  hasInteracted: boolean;
  isTransitioning: boolean;
  lastAction: string;
  lastError: string | null;
  timestamp: string;
  inputState: string;
  authState: string;
  lastWebhookCall: string | null;
  lastWebhookResponse: any;
  routeInfo: {
    pathname: string;
    fullUrl: string;
    search: string;
    hash: string;
  };
  browserInfo: {
    userAgent: string;
    platform: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    isIOSSafari: boolean;
  };
  performanceInfo: {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
    };
    navigationTiming?: any;
    fps: number;
  };
  domInfo: {
    bodyChildren: number;
    totalElements: number;
    inputElements: number;
  };
  supabaseInfo: {
    connectionStatus: string;
    lastConnectionAttempt: string | null;
    connectionLatency: number | null;
    authStatus: string;
    retryCount: number;
    lastError: string | null;
    environment: string | null;
    isInitialized: boolean;
  };
  bootstrapInfo: {
    stage: string;
    startTime: string | null;
    completionTime: string | null;
    steps: Array<{
      step: string;
      status: string;
      timestamp: string;
      error?: string;
    }>;
    lastError: string | null;
  };
  environmentInfo: {
    type: string | null;
    isDevelopment: boolean;
    isProduction: boolean;
    publicVars: Record<string, string>;
  };
  storageInfo: {
    availableSpace: number | null;
    usedSpace: number | null;
    appKeys: string[];
    errors: string[];
  };
  consoleLogs: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
}

declare global {
  interface Window {
    debugState?: DebugState;
    supabaseConnectionStartTime?: number;
    bootstrapStartTime?: string;
  }
}
