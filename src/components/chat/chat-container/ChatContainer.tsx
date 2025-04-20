
import React, { useRef, useEffect, useState } from 'react';
import { CollapsibleHeader } from '../CollapsibleHeader';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { Welcome } from '../Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatDebugOverlay } from './ChatDebugOverlay';
import { DebugInfo } from '@/types/chat';

export const ChatContainer = () => {
  const {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  } = useChat();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
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
    if (messages.length > 0 && !hasInteracted) {
      console.log('Transitioning from Welcome to Chat UI:', {
        messageCount: messages.length,
        hasInteracted: hasInteracted,
        isLoading: isLoading,
        timestamp: new Date().toISOString()
      });
      setHasInteracted(true);
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
    </div>
  );
};
