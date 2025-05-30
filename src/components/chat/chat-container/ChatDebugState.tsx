
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { emitDebugEvent } from '@/utils/debug-events';
import { emitBootstrapEvent, collectEnvironmentInfo } from '@/utils/debug';
import { StateDebugPanel } from '@/components/debug/StateDebugPanel';
import { ChatDebugOverlay } from './ChatDebugOverlay';
import { Message, DebugInfo } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { logger } from '@/utils/logging';

interface ChatDebugStateProps {
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
  setHasInteracted: (value: boolean) => void;
}

const INITIAL_DEBUGINFO: DebugInfo = {
  viewportHeight: 0,
  inputVisible: true,
  inputPosition: { top: 0, left: 0, bottom: 0 },
  messageCount: 0,
  isIOSSafari: false,
  computedStyles: {
    position: '',
    display: '',
    visibility: '',
    height: '',
    zIndex: '',
    overflow: '',
    transform: '',
    opacity: ''
  },
  parentInfo: {
    overflow: '',
    height: '',
    position: ''
  }
};

export const ChatDebugState: React.FC<ChatDebugStateProps> = ({
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
  isTransitioning,
  setIsTransitioning,
  setHasInteracted
}) => {
  const { isDevMode } = useDevMode();
  const [debugInfo, setDebugInfo] = useState(INITIAL_DEBUGINFO);
  const [lastWebhookCall, setLastWebhookCall] = useState<string | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize debug tracking in all environments when dev mode is enabled
  useEffect(() => {
    if (!isDevMode) return;

    const handler = (e: any) => {
      const url = e?.detail?.webhookUrl;
      if (url) setLastWebhookCall(`Using ${url.includes('9553f3d014f7') ? 'AUTHENTICATED' : 'ANONYMOUS'} webhook`);
    };
    window.addEventListener('webhookCall', handler);
    
    const bootstrapState = localStorage.getItem('supabase_bootstrap_state');
    const isBootstrapInitialized = bootstrapState && 
      JSON.parse(bootstrapState).stage !== 'not_started' && 
      JSON.parse(bootstrapState).stage !== 'failed';
    
    if (!isBootstrapInitialized) {
      emitBootstrapEvent('initializing');
    }
    
    if (typeof window !== 'undefined') {
      (window as any).supabaseConnectionStartTime = performance.now();
    }
    
    collectEnvironmentInfo();
    
    const authState = isAuthenticated ? 'authenticated' : 'unauthenticated';
    window.dispatchEvent(new CustomEvent('chatDebug', { 
      detail: { 
        supabaseInfo: {
          authStatus: authState,
          lastAuthChange: new Date().toISOString()
        }
      }
    }));
    
    const completeBootstrap = setTimeout(() => {
      emitBootstrapEvent('completed');
    }, 2000);
    
    return () => {
      window.removeEventListener('webhookCall', handler);
      clearTimeout(completeBootstrap);
    };
  }, [isAuthenticated, isDevMode]);

  // Viewport and Safari detection
  useEffect(() => {
    if (!isDevMode) return;
    
    setDebugInfo(di => ({
      ...di,
      isIOSSafari: /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window) &&
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      viewportHeight: window.innerHeight
    }));
  }, [isDevMode]);

  // Main state management effect
  useEffect(() => {
    if (!isDevMode) return;

    if (messages.length > 0 && !hasInteracted) {
      logger.info('Transitioning from Welcome to Chat UI', {
        messageCount: messages.length, hasInteracted, isLoading,
        timestamp: new Date().toISOString()
      }, { module: 'ui' });
      setIsTransitioning(true);
      emitDebugEvent({ lastAction: 'Starting transition to chat', isTransitioning: true, screen: 'Transitioning to Chat' });
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setHasInteracted(true);
        setIsTransitioning(false);
        emitDebugEvent({
          lastAction: 'Completed transition to chat', isTransitioning: false, hasInteracted: true, screen: 'Chat Screen'
        });
        transitionTimeoutRef.current = null;
      }, 100);
    }

    if (messages.length === 0 && hasInteracted) {
      logger.info('Resetting to Welcome screen (messages cleared)', {}, { module: 'ui' });
      setHasInteracted(false);
      emitDebugEvent({
        screen: 'Welcome Screen',
        lastAction: 'Reset to welcome screen (messages cleared)',
        hasInteracted: false,
        isTransitioning: false
      });
    }

    // Update debug info
    setDebugInfo(di => {
      let update = { ...di, messageCount: messages.length };
      const ref = inputContainerRef.current;
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const cs = window.getComputedStyle(ref);
        const parentStyle = ref.parentElement ? window.getComputedStyle(ref.parentElement) : undefined;
        update = {
          ...update,
          inputVisible: cs.display !== 'none' && cs.visibility !== 'hidden',
          inputPosition: { top: rect.top, left: rect.left, bottom: rect.bottom },
          computedStyles: {
            position: cs.position, display: cs.display, visibility: cs.visibility,
            height: cs.height, zIndex: cs.zIndex, overflow: cs.overflow,
            transform: cs.transform, opacity: cs.opacity
          },
          parentInfo: parentStyle ? {
            overflow: parentStyle.overflow, height: parentStyle.height, position: parentStyle.position
          } : di.parentInfo
        };
      }
      return update;
    });
  }, [messages.length, hasInteracted, isLoading, setHasInteracted, setIsTransitioning, isDevMode]);

  // Safety timeout for transitions
  useEffect(() => {
    if (!isTransitioning || !isDevMode) return;
    const timeout = setTimeout(() => {
      setIsTransitioning(false);
      if (messages.length > 0) {
        setHasInteracted(true);
        emitDebugEvent({
          lastAction: 'Force completed transition to chat (timeout)',
          isTransitioning: false, hasInteracted: true, screen: 'Chat Screen'
        });
      } else {
        emitDebugEvent({
          lastAction: 'Force reset to welcome screen (timeout)',
          isTransitioning: false, hasInteracted: false, screen: 'Welcome Screen'
        });
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isTransitioning, messages.length, setHasInteracted, setIsTransitioning, isDevMode]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
  }, []);

  const setInputContainerRef = useCallback((ref: HTMLDivElement | null) => {
    inputContainerRef.current = ref;
  }, []);

  // Only render when dev mode is explicitly enabled
  if (!isDevMode) return null;

  return (
    <>
      {isDevMode && <ChatDebugOverlay debugInfo={debugInfo} />}
      <StateDebugPanel
        messages={messages}
        isLoading={isLoading}
        hasInteracted={hasInteracted}
        message={message}
        isAuthLoading={isAuthLoading}
        isAuthenticated={isAuthenticated}
        lastWebhookCall={lastWebhookCall}
      />
    </>
  );
};
