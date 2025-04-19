
import React, { useRef, useEffect, useState } from 'react';
import { CollapsibleHeader } from './CollapsibleHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Welcome } from './Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';

export const Chat = () => {
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
  
  // Enhanced debug state to track iOS Safari rendering
  const [debugInfo, setDebugInfo] = useState({
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

  // Detect iOS Safari
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                  !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    setDebugInfo(prev => ({
      ...prev,
      isIOSSafari: isIOS && isSafari,
      viewportHeight: window.innerHeight
    }));
    
    console.log("Browser detection:", { 
      isIOS, 
      isSafari, 
      userAgent: navigator.userAgent, 
      viewportHeight: window.innerHeight
    });
  }, []);
  
  // Track viewport changes
  useEffect(() => {
    const handleResize = () => {
      setDebugInfo(prev => ({
        ...prev,
        viewportHeight: window.innerHeight
      }));
      console.log("Viewport changed:", { height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Effect to start interaction tracking and debug input visibility
  useEffect(() => {
    if (messages.length > 0 && !hasInteracted) {
      setHasInteracted(true);
    }
    
    // Log message state changes
    console.log("Messages state changed:", { 
      count: messages.length, 
      hasInteracted, 
      isInputHidden: messages.length === 0
    });
    
    setDebugInfo(prev => ({
      ...prev,
      messageCount: messages.length
    }));
    
    // Add a small delay to check input container after render
    setTimeout(() => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(inputContainerRef.current);
        
        // Get parent element's style info
        const parentStyle = inputContainerRef.current.parentElement 
          ? window.getComputedStyle(inputContainerRef.current.parentElement)
          : null;
          
        // Enhanced logging of styles that could affect visibility
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
        
        console.log("Input container detailed styles:", {
          exists: !!inputContainerRef.current,
          rect: rect,
          computed: {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex,
            overflow: computedStyle.overflow,
            top: computedStyle.top,
            bottom: computedStyle.bottom,
            height: computedStyle.height,
            minHeight: computedStyle.minHeight,
            opacity: computedStyle.opacity,
            transform: computedStyle.transform
          },
          parent: {
            tag: inputContainerRef.current.parentElement?.tagName,
            id: inputContainerRef.current.parentElement?.id,
            overflow: parentStyle?.overflow,
            height: parentStyle?.height,
            position: parentStyle?.position
          }
        });
      } else {
        console.log("Input container not found in DOM");
      }
    }, 500);
  }, [messages.length, hasInteracted]);

  // Render debugging overlay on iOS Safari with enhanced information
  const renderDebugOverlay = () => {
    if (!debugInfo.isIOSSafari) return null;
    
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: '10px',
          padding: '4px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        <div>Messages: {debugInfo.messageCount}</div>
        <div>Input visible: {debugInfo.inputVisible ? 'Yes' : 'No'}</div>
        <div>Viewport: {debugInfo.viewportHeight}px</div>
        <div>Input pos: T{debugInfo.inputPosition.top.toFixed(0)} 
          B{debugInfo.inputPosition.bottom.toFixed(0)}</div>
        <div>Style: {debugInfo.computedStyles.position} {debugInfo.computedStyles.display} 
          h:{debugInfo.computedStyles.height}</div>
        <div>Parent: {debugInfo.parentInfo.position} {debugInfo.parentInfo.overflow} 
          h:{debugInfo.parentInfo.height}</div>
      </div>
    );
  };

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
      
      {/* Input container with ref for debugging - FIXED iOS Safari positioning */}
      <div 
        ref={inputContainerRef}
        className={`p-4 border-t bg-background ${messages.length === 0 ? 'hidden' : 'block'} ${debugInfo.isIOSSafari ? 'ios-input-container' : ''}`}
        id="message-input-container"
        style={debugInfo.isIOSSafari ? { 
          display: 'block',
          position: 'relative',
          minHeight: '80px',
          border: '2px solid blue'
        } : {}}
      >
        <MessageInput
          message={message}
          onChange={setMessage}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
      
      {/* Debug overlay */}
      {renderDebugOverlay()}
    </div>
  );
};
