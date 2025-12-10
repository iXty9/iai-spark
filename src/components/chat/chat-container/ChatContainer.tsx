
import React, { useState, useRef, useEffect } from 'react';
import { MessageList, MessageListHandle } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { Welcome } from '../Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatLayout } from './ChatLayout';
import { ChatDebugState } from './ChatDebugState';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logging';
import { WebSocketStatusIndicator } from '@/components/websocket/WebSocketStatusIndicator';
import { ProactiveMessage } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface ChatContainerProps {
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ className }) => {
  const {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat,
    setMessages,
    addMessage,
    handleAbortRequest,
  } = useChat();
  
  const { isIOSSafari } = useIOSSafari();
  const { user, isLoading: authLoading } = useAuth();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<MessageListHandle>(null);
  
  // Add chat-active class to body when chat container is mounted
  useEffect(() => {
    document.body.classList.add('chat-active');
    return () => {
      document.body.classList.remove('chat-active');
    };
  }, []);

  // Messages are already in the correct format from useChat hook
  const convertedMessages: Message[] = messages;
  
  const handleImportChat = (importedMessages: Message[]) => {
    if (importedMessages && importedMessages.length > 0) {
      setMessages(importedMessages);
      setHasInteracted(true);
    }
  };

  // Handle proactive message transition - this only adds the AI message without creating a user message
  const handleProactiveTransition = (proactiveMessage: ProactiveMessage) => {
    logger.info('Handling proactive message transition:', proactiveMessage);
    
    // Convert proactive message to chat message format
    const chatMessage: Message = {
      id: proactiveMessage.id,
      content: proactiveMessage.content,
      sender: 'ai',
      timestamp: proactiveMessage.timestamp,
      metadata: { isProactive: true, ...proactiveMessage.metadata }
    };
    
    // Add only the AI message to the chat - no user message creation
    addMessage(chatMessage);
    setHasInteracted(true);
  };

  const handleScrollStateChange = (hasScrolledUp: boolean) => {
    setShowScrollButton(hasScrolledUp);
  };

  const handleScrollToBottom = () => {
    messageListRef.current?.scrollToBottom();
    setShowScrollButton(false);
  };

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
      onImportChat={handleImportChat}
      messages={convertedMessages}
      className={className}
    >
      <div className="flex-1 overflow-hidden relative bg-transparent">
        {/* Use the WebSocket status indicator component */}
        <div className="absolute top-2 right-2 z-10">
          <WebSocketStatusIndicator />
        </div>
        
        {convertedMessages.length === 0 ? (
          <Welcome 
            onStartChat={startChat} 
            onImportChat={handleImportChat}
            onProactiveTransition={handleProactiveTransition}
          />
        ) : (
          <MessageList
            ref={messageListRef}
            messages={convertedMessages}
            isLoading={isLoading}
            scrollRef={scrollRef}
            onAbortRequest={handleAbortRequest}
            onScrollStateChange={handleScrollStateChange}
          />
        )}
      </div>
      
      {convertedMessages.length > 0 && (
        <div 
          ref={inputContainerRef}
          className={cn(
            `p-4 border-t bg-background/80 backdrop-blur-sm relative ${isIOSSafari ? 'ios-input-container' : ''}`,
          )}
          id="message-input-container"
          style={{
            display: "block", 
            position: "relative",
            visibility: "visible",
            minHeight: '88px',
            zIndex: 100,
            paddingBottom: `calc(0.75rem + var(--safe-area-inset-bottom, 0px))`,
            '--chat-input-height': inputContainerRef.current?.offsetHeight ? `${inputContainerRef.current.offsetHeight}px` : '88px'
          } as React.CSSProperties}
        >
          {/* Scroll to bottom button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleScrollToBottom}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-14 z-30",
              "rounded-full transition-all duration-300",
              "hover:bg-primary/10 hover:text-primary",
              "shadow-md h-12 w-12 bg-background/80 backdrop-blur-sm",
              "border border-border/20",
              showScrollButton ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            )}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
          
          <MessageInput
            message={message}
            onChange={setMessage}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
      
      <ChatDebugState 
        messages={convertedMessages}
        isLoading={isLoading}
        hasInteracted={hasInteracted}
        message={message}
        isAuthLoading={authLoading}
        isAuthenticated={!!user}
        isTransitioning={isTransitioning}
        setIsTransitioning={setIsTransitioning}
        setHasInteracted={setHasInteracted}
      />
    </ChatLayout>
  );
};
