
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
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logging';

interface ChatContainerProps {
  className?: string;
  onReloadTheme?: () => void;
  isThemeLoading?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  className, 
  onReloadTheme,
  isThemeLoading = false
}) => {
  const {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat,
    setMessages
  } = useChat();
  
  const { isIOSSafari } = useIOSSafari();
  const { user, isLoading: authLoading } = useAuth();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // Log theme loading state changes
  React.useEffect(() => {
    logger.info('ChatContainer theme loading state:', { 
      module: 'chat', 
      isThemeLoading
    });
  }, [isThemeLoading]);
  
  const handleImportChat = (importedMessages: Message[]) => {
    if (importedMessages && importedMessages.length > 0) {
      setMessages(importedMessages);
      setHasInteracted(true);
    }
  };

  // Render loading state if theme is still loading
  if (isThemeLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background/20 backdrop-blur-sm">
        <div className="text-center p-6 rounded-lg border border-border/30 bg-background/80 backdrop-blur-md">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium mb-1">Loading theme...</p>
          <p className="text-sm text-muted-foreground">Please wait while we prepare your experience</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout
      onClearChat={handleClearChat}
      onExportChat={handleExportChat}
      onImportChat={handleImportChat}
      onReloadTheme={onReloadTheme}
      messages={messages}
      className={className}
    >
      <div className="flex-1 overflow-hidden relative bg-transparent">
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
