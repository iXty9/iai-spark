
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
    addMessage,
    isWebSocketConnected,
    isWebSocketEnabled
  } = useChat();
  
  const { isIOSSafari } = useIOSSafari();
  const { user, isLoading: authLoading } = useAuth();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Convert messages to the expected format for components
  const convertedMessages: Message[] = messages.map(msg => ({
    id: msg.id,
    sender: msg.role === 'user' ? 'user' : 'ai',
    content: msg.content,
    timestamp: msg.timestamp,
    source: msg.metadata?.isProactive ? 'proactive' : (msg.role === 'user' ? 'user' : 'ai')
  }));
  
  const handleImportChat = (importedMessages: Message[]) => {
    if (importedMessages && importedMessages.length > 0) {
      // Convert imported messages to internal format
      const convertedImported = importedMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        timestamp: msg.timestamp,
        metadata: msg.source === 'proactive' ? { isProactive: true } : {}
      }));
      setMessages(convertedImported);
      setHasInteracted(true);
    }
  };

  // Determine status indicator color and tooltip text
  const getStatusIndicator = () => {
    if (!isWebSocketEnabled) {
      return {
        color: 'bg-red-500',
        tooltip: 'Real-time messaging is disabled'
      };
    } else if (isWebSocketConnected) {
      return {
        color: 'bg-green-500',
        tooltip: 'Connected to real-time updates'
      };
    } else {
      return {
        color: 'bg-gray-400',
        tooltip: 'Real-time messaging enabled but not connected'
      };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
      onImportChat={handleImportChat}
      messages={convertedMessages}
      className={className}
    >
      <div className="flex-1 overflow-hidden relative bg-transparent">
        {/* Always show WebSocket status indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div 
            className={`w-2 h-2 rounded-full ${statusIndicator.color}`}
            title={statusIndicator.tooltip}
          />
        </div>
        
        {convertedMessages.length === 0 ? (
          <Welcome onStartChat={startChat} onImportChat={handleImportChat} />
        ) : (
          <ScrollArea className="h-full py-4 px-2 bg-transparent messages-container">
            <MessageList
              messages={convertedMessages}
              isLoading={isLoading}
              scrollRef={scrollRef}
            />
          </ScrollArea>
        )}
      </div>
      
      {convertedMessages.length > 0 && (
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
