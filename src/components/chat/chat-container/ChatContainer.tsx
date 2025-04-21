
import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { Welcome } from '../Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatLayout } from './ChatLayout';
import { ChatDebugState } from './ChatDebugState';
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
  } = useChat();
  
  const { user, isLoading: authLoading } = useAuth();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                    !(window as any).MSStream &&
                    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Save chat state to sessionStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
      sessionStorage.setItem('hasStartedChat', 'true');
    }
  }, [messages]);

  // Load chat state from sessionStorage on component mount
  useEffect(() => {
    const savedMessages = sessionStorage.getItem('chatMessages');
    const hasStartedChat = sessionStorage.getItem('hasStartedChat');
    
    if (savedMessages && hasStartedChat === 'true') {
      // We don't directly set messages here as it's managed by useChat
      // This just tells our component to show the chat interface instead of welcome
      setHasInteracted(true);
    }
  }, []);

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
    >
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 && !sessionStorage.getItem('hasStartedChat') ? (
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
      
      {(messages.length > 0 || sessionStorage.getItem('hasStartedChat')) && (
        <div 
          ref={inputContainerRef}
          className={`p-4 bg-background ${isIOSSafari ? 'ios-input-container' : ''}`}
          id="message-input-container"
          style={{
            display: "block", 
            position: "relative",
            visibility: "visible",
            minHeight: '80px',
            zIndex: 100,
            borderTop: 'none' // Remove border
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
      
      <ChatDebugState 
        messages={messages}
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
