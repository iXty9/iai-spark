
import { useRef, useEffect, useCallback } from 'react';

interface UseChatScrollProps {
  chatRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  loadMore: () => Promise<void> | void;
  shouldLoadMore: boolean;
}

export function useChatScroll({
  chatRef,
  bottomRef,
  loadMore,
  shouldLoadMore,
}: UseChatScrollProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasInitialLoadedRef = useRef<boolean>(false);
  const hasInitialMessages = useRef<boolean>(false);
  
  // Function to handle loading more messages when scrolling to top
  const handleLoadMore = useCallback(() => {
    if (shouldLoadMore) {
      loadMore();
    }
  }, [loadMore, shouldLoadMore]);

  // Set up intersection observer to detect when user scrolls to top
  useEffect(() => {
    const chatElement = chatRef.current;
    const bottomElement = bottomRef.current;

    if (!chatElement || !bottomElement) return;

    // First determine if we already have messages (check scroll height)
    if (chatElement.scrollHeight > chatElement.clientHeight) {
      hasInitialMessages.current = true;
    }

    // Set up observer for top loading
    const observer = new IntersectionObserver(
      (entries) => {
        // Only trigger on initial load once
        if (!hasInitialLoadedRef.current) {
          hasInitialLoadedRef.current = true;
          return;
        }
        
        const [entry] = entries;
        if (entry?.isIntersecting && shouldLoadMore) {
          handleLoadMore();
        }
      },
      {
        root: chatElement,
        rootMargin: '300px 0px 0px 0px', // Load before user reaches the top
        threshold: 0.1,
      }
    );

    // Create a sentinel element at the top to trigger loading
    const sentinel = document.createElement('div');
    sentinel.className = 'chat-scroll-sentinel h-1';
    chatElement.prepend(sentinel);
    observer.observe(sentinel);

    // Clean up
    return () => {
      observer.disconnect();
      if (sentinel.parentNode === chatElement) {
        chatElement.removeChild(sentinel);
      }
    };
  }, [chatRef, bottomRef, handleLoadMore, shouldLoadMore]);

  // Function to scroll to the bottom
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bottomRef]);

  return {
    loadMore: handleLoadMore,
    scrollToBottom,
    hasInitialMessages: hasInitialMessages.current,
  };
}
