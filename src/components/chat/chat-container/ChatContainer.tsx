import React, { useState, useRef } from 'react';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { Welcome } from '../Welcome';
import { useChat } from '@/hooks/use-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatLayout } from './ChatLayout';
import { ChatDebugState } from './ChatDebugState';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/chat';

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

  const handleImportChat = (importedMessages: Message[]) => {
    setMessages(importedMessages);
  };

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
      onImportChat={handleImportChat}
    >
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 ? (
          <Welcome 
            onStartChat={startChat} 
            onImportChat={handleImportChat}
          />
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
          className={`p-4 border-t bg-background ${isIOSSafari ? 'ios-input-container' : ''}`}
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
