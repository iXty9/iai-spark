
import React, { useRef, useEffect, useState } from 'react';
import { CollapsibleHeader } from '../CollapsibleHeader';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { Welcome } from '../Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatDebugOverlay } from './ChatDebugOverlay';
import { StateDebugPanel } from '@/components/debug/StateDebugPanel';
import { DebugInfo } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { useAuth } from '@/contexts/AuthContext';

export const ChatContainer = () => {
  const {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat,
    authError
  } = useChat();
  
  const { user, isLoading: authLoading } = useAuth();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                  !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    setDebugInfo(prev => ({
      ...prev,
      isIOSSafari: isIOS && isSafari,
      viewportHeight: window.innerHeight
    }));
  }, []);

  // Critical effect to track UI transition
  useEffect(() => {
    // If we have messages but haven't interacted yet, trigger transition
    if (messages.length > 0 && !hasInteracted) {
      console.log('Transitioning from Welcome to Chat UI:', {
        messageCount: messages.length,
        hasInteracted: hasInteracted,
        isLoading: isLoading,
        timestamp: new Date().toISOString()
      });
      
      setIsTransitioning(true);
      emitDebugEvent({ 
        lastAction: 'Starting transition to chat',
        isTransitioning: true,
        screen: 'Transitioning to Chat'
      });
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Add a small delay to ensure state updates fully propagate
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
    
    // If messages are cleared, reset to welcome screen
    if (messages.length === 0 && hasInteracted) {
      console.log('Resetting to Welcome screen (messages cleared)');
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
  }, [messages.length, hasInteracted, isLoading]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle force reset if stuck in transition
  useEffect(() => {
    // If stuck in transition for more than 5 seconds, force reset
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
  }, [isTransitioning, messages.length]);

  return (
    <div className="chat-container flex flex-col h-full overflow-hidden">
      <CollapsibleHeader 
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />
      
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 ? (
          <Welcome onStartChat={startChat} />
        ) : (
          <ScrollArea className="h-full py-4 px-2">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              scrollRef={scrollRef}
            />
          </ScrollArea>
        )}
      </div>
      
      {messages.length > 0 && (
        <div 
          ref={inputContainerRef}
          className={`p-4 border-t bg-background ${debugInfo.isIOSSafari ? 'ios-input-container' : ''}`}
          id="message-input-container"
          style={{
            display: "block", 
            position: "relative",
            visibility: "visible",
            minHeight: '80px',
            zIndex: 100
          }}
        >
          <MessageInput
            message={message}
            onChange={setMessage}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
      
      <ChatDebugOverlay debugInfo={debugInfo} />

      <StateDebugPanel 
        messages={messages}
        isLoading={isLoading}
        hasInteracted={hasInteracted}
        message={message}
        isAuthLoading={authLoading}
        isAuthenticated={!!user}
      />
    </div>
  );
};
