
import React, { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { Separator } from '@/components/ui/separator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { BrowserInfoPanel } from './BrowserInfoPanel';
import { DomInfoPanel } from './DomInfoPanel';
import { EventsActionsPanel } from './EventsActionsPanel';
import { DebugPanelHeader } from './components/DebugPanelHeader';
import { LogsPanel } from './components/LogsPanel';
import { StatusInfoPanel } from './components/StatusInfoPanel';
import { useDebugState } from './hooks/useDebugState';
import { useDebugEvents } from './hooks/useDebugEvents';
import { collectStorage } from './utils/storageUtils';
import { toast } from "@/hooks/use-toast";
import { sendDebugInfo } from '@/utils/debug';

const MAX_LOG = 100, MAX_CONSOLE = 50;

export const StateDebugPanel = ({
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
  const {
    state,
    setState,
    fps,
    setFps,
    lastWebhookResponse,
    setWebhookResp,
    logs,
    consoleLogs,
    addLog,
    addConsole,
    isDevMode
  } = useDebugState({ messages, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, lastWebhookCall });

  const [copied, setCopied] = useState(false);
  const [isExpanded, setExp] = useState(true);
  const [isSending, setSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string>('');

  // Use the events hook
  useDebugEvents(isDevMode, setState, addLog, addConsole, consoleLogs);

  // Storage collection and FPS tracking
  useEffect(() => {
    if (!isDevMode) return;
    
    collectStorage(setState, isDevMode);
    const si = setInterval(() => collectStorage(setState, isDevMode), 30000);
    
    const fpsLoop = (() => {
      let frame: number;
      let lastTime = performance.now();
      const loop = () => {
        const now = performance.now();
        const delta = now - lastTime;
        setFps(delta > 0 ? Math.min(60, Math.round(1000/delta)) : 0);
        lastTime = now;
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frame);
    })();
    
    return () => { 
      clearInterval(si); 
      fpsLoop(); 
    }
  }, [isDevMode, setState, setFps]);

  // State sync effect
  useEffect(() => {
    if (!isDevMode) return;

    const connectionStatus = isAuthenticated ? 'connected' : 
                           isAuthLoading ? 'connecting' : 
                           'disconnected';
    
    const getEnvironment = () => {
      try {
        let storedEnv = localStorage.getItem('supabase_environment_local');
        
        if (storedEnv && storedEnv.startsWith('{')) {
          const envObj = JSON.parse(storedEnv);
          storedEnv = envObj.id || envObj.type || null;
        }
        
        return storedEnv || 
               (window.location.hostname === 'localhost' ? 'development' : 'production');
      } catch (e) {
        return window.location.hostname === 'localhost' ? 'development' : 'production';
      }
    };

    setState((s: any) => ({
      ...s,
      screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
      messagesCount: messages.length,
      isLoading,
      hasInteracted,
      lastWebhookCall,
      lastWebhookResponse,
      inputState: isLoading ? 'Disabled' : message.trim() ? 'Ready to Send' : 'Empty',
      authState: isAuthLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated',
      routeInfo: {
        pathname: window.location.pathname,
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash
      },
      supabaseInfo: {
        ...s.supabaseInfo,
        connectionStatus,
        authStatus: isAuthenticated ? 'authenticated' : 'unauthenticated',
        environment: getEnvironment(),
        isInitialized: isAuthenticated
      },
      browserInfo: {
        ...s.browserInfo,
        viewport: {width: window.innerWidth, height: window.innerHeight}
      },
      performanceInfo: {
        ...s.performanceInfo,
        memory: performance?.memory ? { 
          usedJSHeapSize: performance.memory.usedJSHeapSize, 
          totalJSHeapSize: performance.memory.totalJSHeapSize 
        } : undefined, 
        fps
      },
      domInfo: {
        bodyChildren: document.body?.children.length || 0,
        totalElements: document.getElementsByTagName('*').length,
        inputElements: document.getElementsByTagName('input').length
      }
    }));
    // eslint-disable-next-line
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps, lastWebhookCall, lastWebhookResponse, isDevMode, setState]);

  useEffect(() => {
    if (!isDevMode) return;

    const onResize = () => setState((s: any) => ({
      ...s,
      browserInfo: {
        ...s.browserInfo,
        viewport: {width: window.innerWidth, height: window.innerHeight}
      }
    })); 
    window.addEventListener('resize', onResize); 
    return () => window.removeEventListener('resize', onResize)
  }, [isDevMode, setState]);

  // Panel handlers
  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
  };
  
  const send = async() => {
    setSending(true);
    setSendingStatus('Preparing bug report...');
    
    try {
      const dbg = window.debugState || state;
      const kf = (k: string) => k.startsWith('app:') || k.startsWith('supabase') || k.startsWith('sb-');
      const info = {
        ...dbg, 
        timestamp: new Date().toISOString(), 
        logs: logs.slice(0, 20), 
        consoleLogs: consoleLogs.slice(0, 50),
        userAgent: state.browserInfo.userAgent, 
        url: window.location.href,
        localStorage: { 
          keys: Object.keys(localStorage).filter(kf), 
          totalItems: localStorage.length 
        },
        sessionStorage: { 
          keys: Object.keys(sessionStorage).filter(kf), 
          totalItems: sessionStorage.length 
        }
      };
      
      setSendingStatus('Sending to development team...');
      const result = await sendDebugInfo(info);
      
      if(result.success) {
        setSendingStatus('');
        toast({title: "Bug Report Sent", description: "Successfully sent bug report to development team"}); 
        addLog("Bug report sent to development team");
      } else {
        throw new Error(result.error);
      }
    } catch(e: any) {
      setSendingStatus('');
      
      const isTimeout = e?.message?.includes('timeout') || e?.message?.includes('30 seconds');
      const errorTitle = isTimeout ? "Bug Report May Still Be Processing" : "Failed to Send Bug Report";
      const errorDesc = isTimeout ? 
        "The request timed out but may still complete in the background." : 
        e?.message;
      
      toast({
        variant: isTimeout ? "default" : "destructive", 
        title: errorTitle, 
        description: errorDesc
      }); 
      addLog(`Error sending bug report: ${e?.message}`);
    } finally {
      setSending(false);
      setSendingStatus('');
    }
  };
  
  if (!isDevMode) return null;
  
  const row = (k: string, v: any) => <div><span className="text-yellow-300">{k}:</span> {v}</div>;

  return <div className="fixed left-0 w-full bg-black/90 text-white p-2 z-[9999] font-mono text-xs rounded-t-md border border-gray-700"
    style={{bottom: messages.length > 0 ? '80px' : '10px', maxHeight: isExpanded ? '40vh' : '32px', overflow: isExpanded ? 'auto' : 'hidden', transition: 'all .3s ease'}}
  >
    <DebugPanelHeader
      copied={copied}
      isExpanded={isExpanded}
      isSending={isSending}
      sendingStatus={sendingStatus}
      onCopy={copy}
      onToggleExpand={() => setExp(e => !e)}
      onSend={send}
    />
    {isExpanded && (
      <div className="grid grid-cols-2 gap-1">
        {row('Current Screen', state.screen)}
        {row('Current Route', state.routeInfo.pathname)}
        {row('Messages', state.messagesCount)}
        {row('Loading', `${state.isLoading}`)}
        {row('Has Interacted', `${state.hasInteracted}`)}
        {row('Input State', state.inputState)}
        {row('Auth', state.authState)}
        {state.lastWebhookCall && <div className="col-span-2"><span className="text-green-400">Last Webhook:</span> {state.lastWebhookCall}</div>}
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <PerformanceMetrics fps={state.performanceInfo.fps ?? 0} memory={state.performanceInfo.memory} />
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <BrowserInfoPanel browserInfo={state.browserInfo} />
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <DomInfoPanel domInfo={state.domInfo}/>
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <EventsActionsPanel lastAction={state.lastAction} lastError={state.lastError} timestamp={state.timestamp} lastWebhookResponse={state.lastWebhookResponse}/>
        <LogsPanel logs={logs} consoleLogs={consoleLogs} maxLog={MAX_LOG} maxConsole={MAX_CONSOLE} />
        <StatusInfoPanel state={state} />
      </div>
    )}
  </div>
};
