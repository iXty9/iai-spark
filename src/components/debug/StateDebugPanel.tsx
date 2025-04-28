import React, { useState, useRef, useEffect } from 'react';
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

interface DebugState {
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
  lastWebhookResponse: any | null;
  browserInfo: {
    userAgent: string;
    platform: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    isIOSSafari: boolean;
  };
  performanceInfo: {
    memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
    navigationTiming?: { loadEventEnd?: number; domComplete?: number };
    fps?: number;
  };
  domInfo: {
    bodyChildren: number;
    totalElements: number;
    inputElements: number;
  };
}

interface StateDebugPanelProps {
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  lastWebhookCall?: string | null;
}

const MAX_LOG_ENTRIES = 100;
const DEBUG_WEBHOOK_URL = "https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d8534";

export const StateDebugPanel: React.FC<StateDebugPanelProps> = ({
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
  lastWebhookCall = null
}) => {
  const { isDevMode } = useDevMode();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastFrameTime, setLastFrameTime] = useState(performance.now());
  const [fps, setFps] = useState(0);
  const [lastWebhookResponse, setLastWebhookResponse] = useState<any>(null);
  const [isSendingDebug, setIsSendingDebug] = useState(false);
  
  const [logEntries, setLogEntries] = useState<Array<{timestamp: string, message: string}>>([]);
  
  const [debugState, setDebugState] = useState<DebugState>({
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
      isIOSSafari: /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                   /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
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
      bodyChildren: document.body ? document.body.children.length : 0,
      totalElements: document.getElementsByTagName('*').length,
      inputElements: document.getElementsByTagName('input').length
    }
  });

  useEffect(() => {
    const handleDebugEvent = (e: CustomEvent) => {
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        message: e.detail.lastAction || 'Debug event'
      };
      
      setLogEntries(prev => {
        const updated = [newLogEntry, ...prev];
        return updated.slice(0, MAX_LOG_ENTRIES);
      });
      
      setDebugState(prev => ({
        ...prev,
        ...e.detail,
        timestamp: new Date().toISOString()
      }));
    };
    
    const handleWebhookCall = (e: CustomEvent) => {
      const detail = e.detail;
      console.log('Webhook call event:', detail);
      
      if (detail.status === 'RESPONSE_RECEIVED' && detail.responseData) {
        setLastWebhookResponse(detail.responseData);
        
        setLogEntries(prev => {
          const updated = [
            {
              timestamp: new Date().toISOString(),
              message: `Webhook response: ${detail.webhookType || 'Unknown'}`
            },
            ...prev
          ];
          return updated.slice(0, MAX_LOG_ENTRIES);
        });
      }
    };
    
    window.addEventListener('chatDebug' as any, handleDebugEvent);
    window.addEventListener('webhookCall' as any, handleWebhookCall);
    
    return () => {
      window.removeEventListener('chatDebug' as any, handleDebugEvent);
      window.removeEventListener('webhookCall' as any, handleWebhookCall);
    };
  }, []);

  useEffect(() => {
    let frameId: number;
    let lastUpdate = performance.now();
    const updateInterval = 500;
    
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      
      if (now - lastUpdate > updateInterval) {
        if (delta > 0) {
          const newFps = Math.round(1000 / delta);
          setFps(newFps > 60 ? 60 : newFps);
        }
        lastUpdate = now;
      }
      
      setLastFrameTime(now);
      frameId = requestAnimationFrame(updateFps);
    };
    
    frameId = requestAnimationFrame(updateFps);
    
    return () => cancelAnimationFrame(frameId);
  }, [lastFrameTime]);

  useEffect(() => {
    const updateTimer = setTimeout(() => {
      setDebugState(prev => ({
        ...prev,
        screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
        messagesCount: messages.length,
        isLoading,
        hasInteracted,
        lastWebhookCall,
        lastWebhookResponse,
        inputState: isLoading ? 'Disabled' : message.trim() ? 'Ready to Send' : 'Empty',
        authState: isAuthLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated',
        browserInfo: {
          ...prev.browserInfo,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        },
        performanceInfo: {
          ...prev.performanceInfo,
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : undefined,
          fps
        },
        domInfo: {
          bodyChildren: document.body ? document.body.children.length : 0,
          totalElements: document.getElementsByTagName('*').length,
          inputElements: document.getElementsByTagName('input').length
        }
      }));
    }, 250);
    
    return () => clearTimeout(updateTimer);
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps, lastWebhookCall, lastWebhookResponse]);

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setDebugState(prev => ({
          ...prev,
          browserInfo: {
            ...prev.browserInfo,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          }
        }));
      }, 250);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const sendDebugInfoToWebhook = async () => {
    setIsSendingDebug(true);
    try {
      const debugInfo = {
        ...debugState,
        timestamp: new Date().toISOString(),
        logs: logEntries.slice(0, 20),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      const result = await sendDebugInfo(debugInfo);
      
      if (result.success) {
        toast({
          title: "Debug Info Sent",
          description: "Successfully sent debug information to webhook",
        });
        
        setLogEntries(prev => [{
          timestamp: new Date().toISOString(),
          message: "Debug info sent to webhook"
        }, ...prev].slice(0, MAX_LOG_ENTRIES));
      } else {
        throw new Error(`Failed to send debug info: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending debug info:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send Debug Info",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      
      setLogEntries(prev => [{
        timestamp: new Date().toISOString(),
        message: `Error sending debug info: ${error instanceof Error ? error.message : "Unknown error"}`
      }, ...prev].slice(0, MAX_LOG_ENTRIES));
    } finally {
      setIsSendingDebug(false);
    }
  };

  if (!isDevMode) return null;

  const copyToClipboard = () => {
    const debugText = JSON.stringify(debugState, null, 2);
    navigator.clipboard.writeText(debugText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={sendDebugInfoToWebhook}
            disabled={isSendingDebug}
            title="Send debug info to webhook"
          >
            <Send size={16} className={isSendingDebug ? "animate-pulse" : ""} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={copyToClipboard}
            title="Copy debug info to clipboard"
          >
            {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={toggleExpand}
            title={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <>
          <div className="grid grid-cols-2 gap-1">
            <div><span className="text-yellow-300">Current Screen:</span> {debugState.screen}</div>
            <div><span className="text-yellow-300">Messages:</span> {debugState.messagesCount}</div>
            <div><span className="text-yellow-300">Loading:</span> {debugState.isLoading.toString()}</div>
            <div><span className="text-yellow-300">Has Interacted:</span> {debugState.hasInteracted.toString()}</div>
            <div><span className="text-yellow-300">Input State:</span> {debugState.inputState}</div>
            <div><span className="text-yellow-300">Auth:</span> {debugState.authState}</div>
            
            {debugState.lastWebhookCall && (
              <div className="col-span-2">
                <span className="text-green-400">Last Webhook:</span> {debugState.lastWebhookCall}
              </div>
            )}

            <Separator className="col-span-2 my-1 bg-gray-700" />
            
            <PerformanceMetrics fps={debugState.performanceInfo.fps ?? 0} memory={debugState.performanceInfo.memory} />
            
            <Separator className="col-span-2 my-1 bg-gray-700" />
            
            <BrowserInfoPanel browserInfo={debugState.browserInfo} />
            
            <Separator className="col-span-2 my-1 bg-gray-700" />
            
            <DomInfoPanel domInfo={debugState.domInfo} />

            <Separator className="col-span-2 my-1 bg-gray-700" />
            
            <EventsActionsPanel
              lastAction={debugState.lastAction}
              lastError={debugState.lastError}
              timestamp={debugState.timestamp}
              lastWebhookResponse={debugState.lastWebhookResponse}
            />
            
            <div className="col-span-2 mt-2">
              <div className="text-orange-300 font-bold mb-1">Recent Log Entries ({logEntries.length}/{MAX_LOG_ENTRIES})</div>
              <div className="max-h-32 overflow-y-auto bg-black/40 p-1 rounded text-[10px]">
                {logEntries.map((entry, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>: {entry.message}
                  </div>
                ))}
                {logEntries.length === 0 && <div className="text-gray-500">No logs yet</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
