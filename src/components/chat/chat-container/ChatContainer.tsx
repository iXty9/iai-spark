
import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from '../MessageList';
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
import { useWebSocketConnection } from '@/hooks/chat/use-websocket-connection';
import { logger } from '@/utils/logging';

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
    addMessage
  } = useChat();
  
  const { isIOSSafari } = useIOSSafari();
  const { user, isLoading: authLoading } = useAuth();
  const { isConnected, onProactiveMessage } = useWebSocketConnection();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Handle proactive messages from WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onProactiveMessage((proactiveMessage) => {
      logger.info('Received proactive message:', proactiveMessage, { module: 'chat-container' });
      
      // Convert proactive message to chat message format
      const chatMessage: Message = {
        id: proactiveMessage.id,
        sender: 'ai',
        content: proactiveMessage.content,
        timestamp: proactiveMessage.timestamp,
        source: 'proactive'
      };

      // Add to message state
      addMessage(chatMessage);
      
      // If this is the first message, ensure we transition to chat view
      if (!hasInteracted) {
        setHasInteracted(true);
      }
    });

    return unsubscribe;
  }, [user, onProactiveMessage, addMessage, hasInteracted]);
  
  const handleImportChat = (importedMessages: Message[]) => {
    if (importedMessages && importedMessages.length > 0) {
      setMessages(importedMessages);
      setHasInteracted(true);
    }
  };

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
      onImportChat={handleImportChat}
      messages={messages}
      className={className}
    >
      <div className="flex-1 overflow-hidden relative bg-transparent">
        {user && (
          <div className="absolute top-2 right-2 z-10">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} 
                 title={isConnected ? 'Connected to real-time updates' : 'Not connected to real-time updates'} />
          </div>
        )}
        
        {messages.length === 0 ? (
          <Welcome onStartChat={startChat} onImportChat={handleImportChat} />
        ) : (
          <ScrollArea className="h-full py-4 px-2 bg-transparent messages-container">
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
          className={cn(
            `p-4 border-t bg-background/80 backdrop-blur-sm ${isIOSSafari ? 'ios-input-container' : ''}`,
          )}
          id="message-input-container"
          style={{
            display: "block", 
            position: "relative",
            visibility: "visible",
            minHeight: '80px',
            zIndex: 100,
            paddingBottom: `calc(0.75rem + var(--safe-area-inset-bottom, 0px))`
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
