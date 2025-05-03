
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
import { toast } from 'sonner';
import { haptics } from '@/utils/haptic-feedback';

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
    setMessages
  } = useChat();
  
  const { isIOSSafari } = useIOSSafari();
  const { user, isLoading: authLoading } = useAuth();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  const handleImportChat = (importedMessages: Message[]) => {
    if (importedMessages && importedMessages.length > 0) {
      setMessages(importedMessages);
      setHasInteracted(true);
    }
  };

  const handleRefresh = () => {
    if (isRefreshing || isLoading) return;
    
    setIsRefreshing(true);
    haptics.medium();
    toast.info('Refreshing conversation...');
    
    // Simulate refresh delay
    setTimeout(() => {
      // In a real app, you might reload the chat or get new messages here
      setIsRefreshing(false);
      haptics.success();
      toast.success('Conversation refreshed');
    }, 1500);
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
        {messages.length === 0 ? (
          <Welcome onStartChat={startChat} onImportChat={handleImportChat} />
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading || isRefreshing}
            scrollRef={scrollRef}
            onRefresh={handleRefresh}
          />
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
