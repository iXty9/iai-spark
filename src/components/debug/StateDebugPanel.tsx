import React, { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardCheck, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { BrowserInfoPanel } from './BrowserInfoPanel';
import { DomInfoPanel } from './DomInfoPanel';
import { EventsActionsPanel } from './EventsActionsPanel';
import { toast } from "@/hooks/use-toast";
import { sendDebugInfo } from '@/utils/debug';

const MAX_LOG_ENTRIES = 100;
const MAX_CONSOLE_LOGS = 50;

const initialState = () => {
  const state = {
    screen: 'Initializing...',
    messagesCount: 0,
    isLoading: false,
    hasInteracted: false,
    isTransitioning: false,
    lastAction: 'None',
    lastError: null,
    timestamp: new Date().toISOString(),
    inputState: 'Ready',
    authState: 'Unknown',
    lastWebhookCall: null,
    lastWebhookResponse: null,
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      isIOSSafari: /iPad|iPhone|iPod/.test(navigator.userAgent) && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    },
    performanceInfo: {
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
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
    // New debug information categories
    supabaseInfo: {
      connectionStatus: 'unknown',
      lastConnectionAttempt: null,
      connectionLatency: null,
      authStatus: 'unknown',
      retryCount: 0,
      lastError: null,
      environment: null,
      isInitialized: false
    },
    bootstrapInfo: {
      stage: 'not_started',
      startTime: null,
      completionTime: null,
      steps: [],
      lastError: null
    },
    environmentInfo: {
      type: null,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      publicVars: {}
    },
    storageInfo: {
      availableSpace: null,
      usedSpace: null,
      appKeys: [],
      errors: []
    },
    consoleLogs: []
  };
  
  // Make debug state globally accessible
  if (typeof window !== 'undefined') {
    (window as any).debugState = state;
  }
  
  return state;
};

export const StateDebugPanel: React.FC<{
  messages: Message[], isLoading: boolean, hasInteracted: boolean, message: string,
  isAuthLoading: boolean, isAuthenticated: boolean, lastWebhookCall?: string | null
}> = ({
  messages, isLoading, hasInteracted, message,
  isAuthLoading, isAuthenticated, lastWebhookCall = null
}) => {
  const { isDevMode } = useDevMode();
  const [state, setState] = useState(initialState);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [fps, setFps] = useState(0);
  const [lastWebhookResponse, setLastWebhookResponse] = useState<any>(null);
  const [isSendingDebug, setIsSendingDebug] = useState(false);
  const [logEntries, setLogEntries] = useState<{timestamp: string, message: string}[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<{timestamp: string, type: string, message: string}[]>([]);

  // Collapse/Expand panel
  const toggleExpand = () => setIsExpanded(x => !x);

  // Clipboard support
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(console.error);
  };

  // Debug events & Webhook events in 1 effect
  useEffect(() => {
    const addLog = (message: string) =>
      setLogEntries(prev => [{timestamp: new Date().toISOString(), message}, ...prev].slice(0, MAX_LOG_ENTRIES));

    const handleDebugEvent = ({ detail }: any) => {
      addLog(detail.lastAction || 'Debug event');
      setState(s => {
        const newState = { ...s, ...detail, timestamp: new Date().toISOString() };
        // Update global debug state
        if (typeof window !== 'undefined') {
          (window as any).debugState = newState;
        }
        return newState;
      });
    };
    
    const handleWebhookCall = ({ detail }: any) => {
      if (detail.status === 'RESPONSE_RECEIVED' && detail.responseData) {
        setLastWebhookResponse(detail.responseData);
        addLog(`Webhook response: ${detail.webhookType || 'Unknown'}`);
      }
    };
    
    // Handle Supabase connection events
    const handleSupabaseConnection = ({ detail }: any) => {
      const { status, error, timestamp } = detail;
      addLog(`Supabase connection: ${status}${error ? ` (Error: ${error})` : ''}`);
      
      setState(s => {
        const newState = {
          ...s,
          supabaseInfo: {
            ...s.supabaseInfo,
            connectionStatus: status,
            lastConnectionAttempt: timestamp || new Date().toISOString(),
            lastError: error,
            connectionLatency: detail.connectionLatency || s.supabaseInfo.connectionLatency,
            environment: detail.environment || s.supabaseInfo.environment,
            retryCount: status === 'connecting' ? (s.supabaseInfo.retryCount || 0) + 1 : s.supabaseInfo.retryCount,
            isInitialized: status === 'connected'
          },
          timestamp: new Date().toISOString()
        };
        
        // Update global debug state
        if (typeof window !== 'undefined') {
          (window as any).debugState = newState;
        }
        
        return newState;
      });
    };
    
    // Handle bootstrap process events
    const handleBootstrapProcess = ({ detail }: any) => {
      const { stage, error, timestamp, step } = detail;
      addLog(`Bootstrap: ${stage}${error ? ` (Error: ${error})` : ''}`);
      
      setState(s => {
        const steps = [...(s.bootstrapInfo.steps || [])];
        if (step) {
          steps.push(step);
        }
        
        const newState = {
          ...s,
          bootstrapInfo: {
            ...s.bootstrapInfo,
            stage,
            startTime: s.bootstrapInfo.startTime || timestamp || new Date().toISOString(),
            completionTime: stage === 'completed' ? (timestamp || new Date().toISOString()) : s.bootstrapInfo.completionTime,
            steps,
            lastError: error || s.bootstrapInfo.lastError
          },
          timestamp: new Date().toISOString()
        };
        
        // Update global debug state
        if (typeof window !== 'undefined') {
          (window as any).debugState = newState;
        }
        
        return newState;
      });
    };
    
    window.addEventListener('chatDebug', handleDebugEvent);
    window.addEventListener('webhookCall', handleWebhookCall);
    window.addEventListener('supabaseConnection', handleSupabaseConnection);
    window.addEventListener('bootstrapProcess', handleBootstrapProcess);
    
    // Intercept console logs
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    function addConsoleLog(type: string, args: IArguments) {
      const message = Array.from(args).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      setConsoleLogs(prev => [{
        type,
        message,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, MAX_CONSOLE_LOGS));
      
      // Also update global debug state
      if (typeof window !== 'undefined' && (window as any).debugState) {
        (window as any).debugState.consoleLogs = consoleLogs;
      }
    }
    
    console.log = function() {
      addConsoleLog('log', arguments);
      originalConsole.log.apply(console, arguments);
    };
    
    console.error = function() {
      addConsoleLog('error', arguments);
      originalConsole.error.apply(console, arguments);
    };
    
    console.warn = function() {
      addConsoleLog('warn', arguments);
      originalConsole.warn.apply(console, arguments);
    };
    
    console.info = function() {
      addConsoleLog('info', arguments);
      originalConsole.info.apply(console, arguments);
    };
    
    // Collect storage info on mount
    collectStorageInfo();
    
    // Periodically update storage info
    const storageInterval = setInterval(collectStorageInfo, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('chatDebug', handleDebugEvent);
      window.removeEventListener('webhookCall', handleWebhookCall);
      window.removeEventListener('supabaseConnection', handleSupabaseConnection);
      window.removeEventListener('bootstrapProcess', handleBootstrapProcess);
      
      // Restore original console methods
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      
      clearInterval(storageInterval);
    };
  }, []);
  
  // Function to collect localStorage diagnostics
  const collectStorageInfo = () => {
    try {
      const appKeys: string[] = [];
      let totalSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key.startsWith('app:') || key.startsWith('supabase') || key.startsWith('sb-')) {
            appKeys.push(key);
            totalSize += (localStorage.getItem(key)?.length || 0);
          }
        }
      }
      
      // Estimate available space (simplified approach)
      let availableSpace = null;
      try {
        const testKey = '__storage-test__';
        let testString = '';
        const chunk = new Array(1024).join('a'); // 1KB chunk
        
        for (let i = 0; i < 10; i++) { // Try up to 10MB
          testString += chunk;
          localStorage.setItem(testKey, testString);
          if (testString.length >= 1024 * 1024) break; // Stop at 1MB for safety
        }
        
        availableSpace = testString.length;
        localStorage.removeItem(testKey);
      } catch (e) {
        // Storage is full or other error
        availableSpace = 0;
      }
      
      const storageInfo = {
        availableSpace,
        usedSpace: totalSize,
        appKeys,
        errors: []
      };
      
      setState(s => {
        const newState = { ...s, storageInfo };
        if (typeof window !== 'undefined') {
          (window as any).debugState = newState;
        }
        return newState;
      });
    } catch (error: any) {
      setState(s => {
        const newState = { 
          ...s, 
          storageInfo: {
            ...s.storageInfo,
            errors: [...(s.storageInfo.errors || []), error.message]
          }
        };
        if (typeof window !== 'undefined') {
          (window as any).debugState = newState;
        }
        return newState;
      });
    }
  };

  // FPS calculation
  useEffect(() => {
    let frame: number, last = performance.now();
    const loop = () => {
      const now = performance.now(), delta = now - last;
      setFps(delta > 0 ? Math.min(60, Math.round(1000/delta)) : 0);
      last = now; frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Update debug state (including FPS, messages, etc) whenever any dep changes
  useEffect(() => {
    setState(s => ({
      ...s,
      screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
      messagesCount: messages.length,
      isLoading,
      hasInteracted,
      lastWebhookCall,
      lastWebhookResponse,
      inputState: isLoading ? 'Disabled' : message.trim() ? 'Ready to Send' : 'Empty',
      authState: isAuthLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated',
      browserInfo: {
        ...s.browserInfo,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      },
      performanceInfo: {
        ...s.performanceInfo,
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : undefined,
        fps
      },
      domInfo: {
        bodyChildren: document.body?.children.length || 0,
        totalElements: document.getElementsByTagName('*').length,
        inputElements: document.getElementsByTagName('input').length
      }
    }));
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps, lastWebhookCall, lastWebhookResponse]);

  // Update viewport size on resize
  useEffect(() => {
    const onResize = () => setState(s => ({
      ...s,
      browserInfo: {
        ...s.browserInfo,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Send debug info to webhook
  const sendDebugInfoToWebhook = async () => {
    setIsSendingDebug(true);
    try {
      // Get the latest global debug state
      const globalDebugState = (window as any).debugState || state;
      
      const debugInfo = {
        ...globalDebugState,
        timestamp: new Date().toISOString(),
        logs: logEntries.slice(0, 20),
        consoleLogs: consoleLogs.slice(0, 50),
        userAgent: state.browserInfo.userAgent,
        url: window.location.href,
        // Include localStorage keys (just names, not values for privacy)
        localStorage: {
          keys: Object.keys(localStorage).filter(k => 
            k.startsWith('app:') || k.startsWith('supabase') || k.startsWith('sb-')
          ),
          totalItems: localStorage.length
        },
        // Include session storage info
        sessionStorage: {
          keys: Object.keys(sessionStorage).filter(k => 
            k.startsWith('app:') || k.startsWith('supabase') || k.startsWith('sb-')
          ),
          totalItems: sessionStorage.length
        }
      };
      
      const result = await sendDebugInfo(debugInfo);
      if (result.success) {
        toast({ title: "Debug Info Sent", description: "Successfully sent debug information to webhook" });
        setLogEntries(prev => [{ timestamp: new Date().toISOString(), message: "Debug info sent to webhook" }, ...prev].slice(0, MAX_LOG_ENTRIES));
      } else throw new Error(result.error);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Send Debug Info", description: error?.message || "Unknown error" });
      setLogEntries(prev => [{ timestamp: new Date().toISOString(), message: `Error sending debug info: ${error?.message || "Unknown error"}` }, ...prev].slice(0, MAX_LOG_ENTRIES));
    } finally { setIsSendingDebug(false); }
  };

  if (!isDevMode) return null;

  return (
    <div
      className="fixed left-0 w-full bg-black/90 text-white p-2 z-[9999] font-mono text-xs rounded-t-md border border-gray-700"
      style={{
        bottom: messages.length > 0 ? '80px' : '10px',
        maxHeight: isExpanded ? '40vh' : '32px',
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-red-400">DEBUG PANEL</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={sendDebugInfoToWebhook} disabled={isSendingDebug}
            title="Send debug info to webhook">
            <Send size={16} className={isSendingDebug ? "animate-pulse" : ""} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={copyToClipboard} title="Copy debug info to clipboard">
            {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={toggleExpand} title={isExpanded ? "Collapse panel" : "Expand panel"}>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="grid grid-cols-2 gap-1">
          <div><span className="text-yellow-300">Current Screen:</span> {state.screen}</div>
          <div><span className="text-yellow-300">Messages:</span> {state.messagesCount}</div>
          <div><span className="text-yellow-300">Loading:</span> {`${state.isLoading}`}</div>
          <div><span className="text-yellow-300">Has Interacted:</span> {`${state.hasInteracted}`}</div>
          <div><span className="text-yellow-300">Input State:</span> {state.inputState}</div>
          <div><span className="text-yellow-300">Auth:</span> {state.authState}</div>
          {state.lastWebhookCall &&
            <div className="col-span-2"><span className="text-green-400">Last Webhook:</span> {state.lastWebhookCall}</div>
          }
          <Separator className="col-span-2 my-1 bg-gray-700" />
          <PerformanceMetrics fps={state.performanceInfo.fps ?? 0} memory={state.performanceInfo.memory} />
          <Separator className="col-span-2 my-1 bg-gray-700" />
          <BrowserInfoPanel browserInfo={state.browserInfo} />
          <Separator className="col-span-2 my-1 bg-gray-700" />
          <DomInfoPanel domInfo={state.domInfo} />
          <Separator className="col-span-2 my-1 bg-gray-700" />
          <EventsActionsPanel
            lastAction={state.lastAction}
            lastError={state.lastError}
            timestamp={state.timestamp}
            lastWebhookResponse={state.lastWebhookResponse}
          />
          <div className="col-span-2 mt-2">
            <div className="text-orange-300 font-bold mb-1">Recent Log Entries ({logEntries.length}/{MAX_LOG_ENTRIES})</div>
            <div className="max-h-32 overflow-y-auto bg-black/40 p-1 rounded text-[10px]">
              {logEntries.length
                ? logEntries.map((entry, i) =>
                  <div key={i} className="mb-1">
                    <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>: {entry.message}
                  </div>)
                : <div className="text-gray-500">No logs yet</div>
              }
            </div>
          </div>
          
          <div className="col-span-2 mt-2">
            <div className="text-blue-300 font-bold mb-1">Console Logs ({consoleLogs.length}/{MAX_CONSOLE_LOGS})</div>
            <div className="max-h-32 overflow-y-auto bg-black/40 p-1 rounded text-[10px]">
              {consoleLogs.length
                ? consoleLogs.map((entry, i) =>
                  <div key={i} className="mb-1">
                    <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className={
                      entry.type === 'error' ? ' text-red-400' : 
                      entry.type === 'warn' ? ' text-yellow-400' : 
                      entry.type === 'info' ? ' text-blue-400' : 
                      ' text-green-400'
                    }> [{entry.type}]</span>: {entry.message}
                  </div>)
                : <div className="text-gray-500">No console logs captured</div>
              }
            </div>
          </div>
          
          <div className="col-span-2 mt-2">
            <div className="text-purple-300 font-bold mb-1">Storage Info</div>
            <div className="text-[10px]">
              <div><span className="text-purple-200">App Keys:</span> {state.storageInfo.appKeys.length}</div>
              <div><span className="text-purple-200">Used Space:</span> {state.storageInfo.usedSpace ? Math.round(state.storageInfo.usedSpace / 1024) + ' KB' : 'Unknown'}</div>
              {state.storageInfo.errors.length > 0 && (
                <div className="text-red-400">Storage Errors: {state.storageInfo.errors.join(', ')}</div>
              )}
            </div>
          </div>
          
          <div className="col-span-2 mt-2">
            <div className="text-green-300 font-bold mb-1">Supabase Status</div>
            <div className="text-[10px]">
              <div><span className="text-green-200">Connection:</span> {state.supabaseInfo.connectionStatus}</div>
              <div><span className="text-green-200">Auth Status:</span> {state.supabaseInfo.authStatus}</div>
              <div><span className="text-green-200">Environment:</span> {state.supabaseInfo.environment || 'Unknown'}</div>
              {state.supabaseInfo.lastError && (
                <div className="text-red-400">Last Error: {state.supabaseInfo.lastError}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
