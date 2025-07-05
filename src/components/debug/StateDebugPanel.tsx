
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
import { useDebugStateSync } from './hooks/useDebugStateSync';
import { useDebugPanelActions } from './hooks/useDebugPanelActions';
import { collectStorage } from './utils/storageUtils';
import { domManagerService } from '@/services/global/dom-manager-service';
import { timerManagerService } from '@/services/global/timer-manager-service';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/contexts/AuthContext';

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
  const location = useLocation();
  const { profile } = useAuth();
  const {
    state,
    setState,
    fps,
    setFps,
    lastWebhookResponse,
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

  // Use the state sync hook
  useDebugStateSync({
    isDevMode,
    setState,
    messages,
    isLoading,
    hasInteracted,
    message,
    isAuthLoading,
    isAuthenticated,
    fps,
    lastWebhookCall,
    lastWebhookResponse: lastWebhookResponse
  });

  // Use the panel actions hook
  const { copy, send } = useDebugPanelActions({
    state,
    logs,
    consoleLogs,
    setCopied,
    setSending,
    setSendingStatus,
    addLog,
    location,
    profile
  });

  // Storage collection and FPS tracking
  useEffect(() => {
    if (!isDevMode) return;
    
    // Use timer manager service for intervals
    const storageIntervalId = timerManagerService.setInterval(() => {
      collectStorage(setState, isDevMode);
    }, 30000);
    
    // FPS tracking using timer manager
    let fpsFrameId: string | null = null;
    let lastTime = performance.now();
    
    const fpsLoop = () => {
      const now = performance.now();
      const delta = now - lastTime;
      setFps(delta > 0 ? Math.min(60, Math.round(1000/delta)) : 0);
      lastTime = now;
      fpsFrameId = timerManagerService.requestAnimationFrame(fpsLoop);
    };
    
    fpsFrameId = timerManagerService.requestAnimationFrame(fpsLoop);
    
    return () => { 
      timerManagerService.clearTimer(storageIntervalId);
      if (fpsFrameId) {
        timerManagerService.clearTimer(fpsFrameId);
      }
    };
  }, [isDevMode, setState, setFps]);

  // Resize listener using DOM manager service
  useEffect(() => {
    if (!isDevMode) return;

    const cleanup = domManagerService.addResizeListener((viewportInfo) => {
      setState((s: any) => ({
        ...s,
        browserInfo: {
          ...s.browserInfo,
          viewport: { width: viewportInfo.width, height: viewportInfo.height }
        }
      }));
    });

    return cleanup;
  }, [isDevMode, setState]);
  
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
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <div className="col-span-2">
          <div className="text-blue-400 font-bold mb-1">Location Services</div>
          {row('Supported', `${location.isSupported}`)}
          {row('Permission', `${location.hasPermission}`)}
          {row('Auto Update', `${profile?.location_auto_update !== false}`)}
          {location.currentLocation && (
            <>
              {row('Coordinates', `${location.currentLocation.latitude.toFixed(6)}, ${location.currentLocation.longitude.toFixed(6)}`)}
              {location.currentLocation.city && row('City', location.currentLocation.city)}
              {location.currentLocation.country && row('Country', location.currentLocation.country)}
              {location.currentLocation.address && <div className="col-span-2 text-xs break-words"><span className="text-yellow-300">Address:</span> {location.currentLocation.address}</div>}
              {location.lastUpdated && row('Last Updated', location.lastUpdated.toLocaleString())}
            </>
          )}
          {location.error && <div className="col-span-2 text-red-400">Error: {location.error}</div>}
        </div>
        <Separator className="col-span-2 my-1 bg-gray-700"/>
        <LogsPanel logs={logs} consoleLogs={consoleLogs} maxLog={MAX_LOG} maxConsole={MAX_CONSOLE} />
        <StatusInfoPanel state={state} />
      </div>
    )}
  </div>
};
