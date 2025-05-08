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
const initialState = () => ({
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
  }
});

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
      setState(s => ({ ...s, ...detail, timestamp: new Date().toISOString() }));
    };
    const handleWebhookCall = ({ detail }: any) => {
      if (detail.status === 'RESPONSE_RECEIVED' && detail.responseData) {
        setLastWebhookResponse(detail.responseData);
        addLog(`Webhook response: ${detail.webhookType || 'Unknown'}`);
      }
    };
    window.addEventListener('chatDebug', handleDebugEvent);
    window.addEventListener('webhookCall', handleWebhookCall);
    return () => {
      window.removeEventListener('chatDebug', handleDebugEvent);
      window.removeEventListener('webhookCall', handleWebhookCall);
    };
  }, []);

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
      const debugInfo = {
        ...state,
        timestamp: new Date().toISOString(),
        logs: logEntries.slice(0, 20),
        userAgent: state.browserInfo.userAgent,
        url: window.location.href,
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
        </div>
      )}
    </div>
  );
};