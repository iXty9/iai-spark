
import React, { useRef, useEffect, useCallback } from 'react';
import { Message } from '@/components/chat/Message';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { ChatLoading } from './ChatLoading';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';

interface MessageListProps {
  messages: MessageType[];
  loadingState?: 'idle' | 'pending' | 'success' | 'error';
  onFetchHistory?: () => Promise<void>;
  isLoading?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onRefresh?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  loadingState = 'idle',
  onFetchHistory = async () => {},
  isLoading = false,
  scrollRef,
  onRefresh
}) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const actualChatRef = scrollRef || chatRef;

  const { loadMore, hasInitialMessages } = useChatScroll({
    chatRef: actualChatRef,
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

  // Animation for loading indicator
  const refreshAnimation = () => {
    // Use Array.from instead of spread operator on number
    const frames = Array.from({length: 60}).map(
      (_, i) => `transform: translateY(${Math.sin(i / 5) * 10}px) rotate(${i * 6}deg);`
    );
    return frames.join(' ');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto" ref={actualChatRef}>
      <div className="absolute top-0 w-full h-24 flex justify-center items-center">
        {(loadingState === 'pending' || isLoading) && !messages.length && (
          <ChatLoading animation={refreshAnimation()} />
        )}
        {(loadingState === 'pending' || isLoading) && messages.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Loading previous messages...
          </div>
        )}
      </div>
      <div className={cn("flex flex-col-reverse p-4")}>
        {renderMessages()}
        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </div>
  );
};
