import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { BrowserInfoPanel } from './BrowserInfoPanel';
import { DomInfoPanel } from './DomInfoPanel';
import { EventsActionsPanel } from './EventsActionsPanel';

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
}

export const StateDebugPanel: React.FC<StateDebugPanelProps> = ({
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
}) => {
  const { isDevMode } = useDevMode();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastFrameTime, setLastFrameTime] = useState(performance.now());
  const [fps, setFps] = useState(0);
  
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
      setDebugState(prev => ({
        ...prev,
        ...e.detail,
        timestamp: new Date().toISOString()
      }));
    };
    window.addEventListener('chatDebug' as any, handleDebugEvent);
    return () => {
      window.removeEventListener('chatDebug' as any, handleDebugEvent);
    };
  }, []);

  useEffect(() => {
    let frameId: number;
    
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      
      if (delta > 0) {
        const newFps = Math.round(1000 / delta);
        setFps(newFps > 60 ? 60 : newFps); // Cap at 60 FPS for display
      }
      
      setLastFrameTime(now);
      frameId = requestAnimationFrame(updateFps);
    };
    
    frameId = requestAnimationFrame(updateFps);
    
    return () => cancelAnimationFrame(frameId);
  }, [lastFrameTime]);

  useEffect(() => {
    setDebugState(prev => ({
      ...prev,
      screen: messages.length === 0 ? 'Welcome Screen' : 'Chat Screen',
      messagesCount: messages.length,
      isLoading,
      hasInteracted,
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
  }, [messages.length, isLoading, hasInteracted, message, isAuthLoading, isAuthenticated, fps]);

  useEffect(() => {
    const handleResize = () => {
      setDebugState(prev => ({
        ...prev,
        browserInfo: {
          ...prev.browserInfo,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        }
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            onClick={copyToClipboard}
          >
            {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-gray-400 hover:text-white" 
            onClick={toggleExpand}
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
            />
          </div>
        </>
      )}
    </div>
  );
};
