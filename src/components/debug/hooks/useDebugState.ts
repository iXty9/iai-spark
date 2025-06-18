
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { DebugState } from '@/types/global';

const MAX_LOG = 100, MAX_CONSOLE = 50;
const nowISO = () => new Date().toISOString();

const getInitialState = (): DebugState => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && /safari/i.test(userAgent);
  return {
    screen: 'Initializing...',
    messagesCount: 0, isLoading: false, hasInteracted: false, isTransitioning: false,
    lastAction: 'None', lastError: null, timestamp: nowISO(),
    inputState: 'Ready', authState: 'Unknown', lastWebhookCall: null, lastWebhookResponse: null,
    routeInfo: {
      pathname: window.location.pathname,
      fullUrl: window.location.href,
      search: window.location.search,
      hash: window.location.hash
    },
    browserInfo: {
      userAgent, platform: navigator?.platform || 'unknown', viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio, isIOSSafari: isIOS
    },
    performanceInfo: {
      memory: performance?.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : undefined,
      navigationTiming: performance.timing ? {
        loadEventEnd: performance.timing.loadEventEnd,
        domComplete: performance.timing.domComplete
      } : undefined,
      fps: 0
    },
    domInfo: {
      bodyChildren: document.body?.children.length || 0,
      totalElements: document.getElementsByTagName('*').length,
      inputElements: document.getElementsByTagName('input').length
    },
    supabaseInfo: {
      connectionStatus: 'unknown', lastConnectionAttempt: null, connectionLatency: null,
      authStatus: 'unknown', retryCount: 0, lastError: null, environment: null, isInitialized: false
    },
    bootstrapInfo: { stage: 'not_started', startTime: null, completionTime: null, steps: [], lastError: null },
    environmentInfo: {
      type: null,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      publicVars: {}
    },
    storageInfo: { availableSpace: null, usedSpace: null, appKeys: [], errors: [] },
    consoleLogs: []
  }
};

export const useDebugState = ({
  messages, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, lastWebhookCall = null
}: {
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  lastWebhookCall?: string | null;
}) => {
  const { isDevMode } = useDevMode();
  const [state, setState] = useState<DebugState>(getInitialState);
  const [fps, setFps] = useState(0);
  const [lastWebhookResponse, setWebhookResp] = useState(null);
  const [logs, setLogs] = useState<Array<{timestamp: string, message: string}>>([]);
  const [consoleLogs, setConsoleLogs] = useState<Array<{timestamp: string, type: string, message: string}>>([]);

  const addLog = (m: string) => setLogs(l => [{timestamp: nowISO(), message: m}, ...l].slice(0, MAX_LOG));
  const addConsole = (type: string, args: any[]) => {
    const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    setConsoleLogs(l => ([{timestamp:nowISO(),type, message:msg},...l]).slice(0,MAX_CONSOLE));
    if (window.debugState) {
      window.debugState.consoleLogs = consoleLogs;
    }
  };

  return {
    state,
    setState,
    fps,
    setFps,
    lastWebhookResponse,
    setWebhookResp,
    logs,
    setLogs,
    consoleLogs,
    setConsoleLogs,
    addLog,
    addConsole,
    isDevMode
  };
};
