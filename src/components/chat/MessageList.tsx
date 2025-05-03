import React, { useRef, useEffect, useCallback } from 'react';
import { Message } from '@/components/chat/Message';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { ChatLoading } from './ChatLoading';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: any[];
  loadingState: 'idle' | 'pending' | 'success' | 'error';
  onFetchHistory: () => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  loadingState, 
  onFetchHistory
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { loadMore, hasInitialMessages } = useChatScroll({
    chatRef,
    bottomRef,
    loadMore: onFetchHistory,
    shouldLoadMore: loadingState === 'idle',
  });

  useEffect(() => {
    if (loadingState === 'success' && !hasInitialMessages) {
      loadMore();
    }
  }, [loadingState, hasInitialMessages, loadMore]);

  const renderMessages = useCallback(() => {
    return messages.map((message) => (
      <Message key={message.id} message={message} />
    ));
  }, [messages]);

  // Find the correct implementation for refreshAnimation
  const refreshAnimation = () => {
    // Replace the spread on a number with proper array iteration
    // Instead of [...60], use Array.from({length: 60})
    const frames = Array.from({length: 60}).map(
      (_, i) => `transform: translateY(${Math.sin(i / 5) * 10}px) rotate(${i * 6}deg);`
    );
    return frames.join(' ');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto" ref={chatRef}>
      <div className="absolute top-0 w-full h-24 flex justify-center items-center">
        {loadingState === 'pending' && !messages.length && (
          <ChatLoading animation={refreshAnimation()} />
        )}
        {loadingState === 'pending' && messages.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Loading previous messages...
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse p-4">
        {renderMessages()}
        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </div>
  );
};
