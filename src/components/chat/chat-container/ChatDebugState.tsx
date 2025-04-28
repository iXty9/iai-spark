import React from 'react';
import { emitDebugEvent } from '@/utils/debug-events';
import { StateDebugPanel } from '@/components/debug/StateDebugPanel';
import { ChatDebugOverlay } from './ChatDebugOverlay';
import { Message, DebugInfo } from '@/types/chat';
import { useEffect, useState, useRef } from 'react';
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
  
  if (!isDevMode && process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
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
  });
  
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const [lastWebhookCall, setLastWebhookCall] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isDevMode && process.env.NODE_ENV !== 'development') return;
    
    const handleWebhookEvent = (e: CustomEvent) => {
      if (e.detail && e.detail.webhookUrl) {
        const isAuthenticated = e.detail.webhookUrl.includes('9553f3d014f7');
        setLastWebhookCall(`Using ${isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'} webhook`);
      }
    };
    
    window.addEventListener('webhookCall' as any, handleWebhookEvent);
    return () => {
      window.removeEventListener('webhookCall' as any, handleWebhookEvent);
    };
  }, [isDevMode]);

  useEffect(() => {
    if (!isDevMode && process.env.NODE_ENV !== 'development') return;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                  !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    setDebugInfo(prev => ({
      ...prev,
      isIOSSafari: isIOS && isSafari,
      viewportHeight: window.innerHeight
    }));
  }, [isDevMode]);

  useEffect(() => {
    if (!isDevMode && process.env.NODE_ENV !== 'development') return;
    
    if (messages.length > 0 && !hasInteracted) {
      logger.info('Transitioning from Welcome to Chat UI', {
        messageCount: messages.length,
        hasInteracted,
        isLoading,
        timestamp: new Date().toISOString()
      }, { module: 'ui' });
      
      setIsTransitioning(true);
      emitDebugEvent({ 
        lastAction: 'Starting transition to chat',
        isTransitioning: true,
        screen: 'Transitioning to Chat'
      });
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      transitionTimeoutRef.current = setTimeout(() => {
        setHasInteracted(true);
        setIsTransitioning(false);
        emitDebugEvent({ 
          lastAction: 'Completed transition to chat',
          isTransitioning: false,
          hasInteracted: true,
          screen: 'Chat Screen'
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
    
    setDebugInfo(prev => ({
      ...prev,
      messageCount: messages.length
    }));
    
    if (inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(inputContainerRef.current);
      const parentStyle = inputContainerRef.current.parentElement 
        ? window.getComputedStyle(inputContainerRef.current.parentElement)
        : null;
          
      setDebugInfo(prev => ({
        ...prev,
        inputVisible: computedStyle.display !== 'none' && 
                      computedStyle.visibility !== 'hidden',
        inputPosition: { 
          top: rect.top, 
          left: rect.left, 
          bottom: rect.bottom 
        },
        computedStyles: {
          position: computedStyle.position,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          height: computedStyle.height,
          zIndex: computedStyle.zIndex,
          overflow: computedStyle.overflow,
          transform: computedStyle.transform,
          opacity: computedStyle.opacity
        },
        parentInfo: parentStyle ? {
          overflow: parentStyle.overflow,
          height: parentStyle.height,
          position: parentStyle.position
        } : prev.parentInfo
      }));
    }
  }, [messages.length, hasInteracted, isLoading, setHasInteracted, setIsTransitioning, isDevMode]);

  useEffect(() => {
    let forceResetTimeout: NodeJS.Timeout | null = null;
    
    if (isTransitioning) {
      console.log('Transition state detected, setting safety timeout');
      forceResetTimeout = setTimeout(() => {
        console.warn('Force resetting transition state after timeout');
        setIsTransitioning(false);
        
        if (messages.length > 0) {
          setHasInteracted(true);
          emitDebugEvent({
            lastAction: 'Force completed transition to chat (timeout)',
            isTransitioning: false, 
            hasInteracted: true,
            screen: 'Chat Screen'
          });
        } else {
          emitDebugEvent({
            lastAction: 'Force reset to welcome screen (timeout)',
            isTransitioning: false,
            hasInteracted: false,
            screen: 'Welcome Screen'
          });
        }
      }, 5000);
    }
    
    return () => {
      if (forceResetTimeout) {
        clearTimeout(forceResetTimeout);
      }
    };
  }, [isTransitioning, messages.length, setHasInteracted, setIsTransitioning]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);

  const setInputContainerRef = (ref: HTMLDivElement | null) => {
    inputContainerRef.current = ref;
  };

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
