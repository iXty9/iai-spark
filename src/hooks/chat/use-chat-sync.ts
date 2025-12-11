import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { dbRowToMessage } from '@/services/chat/message-sanitizer';
import { logger } from '@/utils/logging';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseChatSyncOptions {
  userId: string | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: (loading: boolean) => void;
  isBulkOperation: React.MutableRefObject<boolean>;
}

/**
 * Hook for real-time chat synchronization across browser instances
 * Only active for authenticated users
 */
export const useChatSync = ({
  userId,
  messages,
  setMessages,
  setIsLoading,
  isBulkOperation
}: UseChatSyncOptions) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  
  // Keep message IDs set in sync with current messages
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map(m => m.id));
  }, [messages]);
  
  // Handle INSERT events from other instances
  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    // Skip if bulk operation in progress
    if (isBulkOperation.current) {
      logger.debug('Skipping realtime INSERT during bulk operation', {}, { module: 'chat-sync' });
      return;
    }
    
    const newRow = payload.new;
    if (!newRow || newRow.user_id !== userId) return;
    
    // Deduplicate: check if we already have this message
    if (messageIdsRef.current.has(newRow.message_id)) {
      logger.debug('Ignoring duplicate message from realtime', {
        messageId: newRow.message_id
      }, { module: 'chat-sync' });
      return;
    }
    
    // Convert DB row to Message and add to state
    const message = dbRowToMessage(newRow);
    
    logger.info('Received new message from another instance', {
      messageId: message.id,
      sender: message.sender
    }, { module: 'chat-sync' });
    
    setMessages(prev => {
      // Double-check deduplication with functional update
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      // Insert in correct timestamp order
      const newMessages = [...prev, message].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return newMessages;
    });
  }, [userId, setMessages, isBulkOperation]);
  
  // Handle DELETE events (individual message deletes)
  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    // Skip if bulk operation in progress
    if (isBulkOperation.current) {
      logger.debug('Skipping realtime DELETE during bulk operation', {}, { module: 'chat-sync' });
      return;
    }
    
    const oldRow = payload.old as { user_id?: string; message_id?: string } | undefined;
    if (!oldRow || !oldRow.user_id || oldRow.user_id !== userId) return;
    
    // If we receive a delete, remove that message from local state
    logger.debug('Received delete event from another instance', {
      messageId: oldRow.message_id
    }, { module: 'chat-sync' });
    
    if (oldRow.message_id) {
      setMessages(prev => prev.filter(m => m.id !== oldRow.message_id));
    }
  }, [userId, setMessages, isBulkOperation]);
  
  // Handle broadcast "clear chat" event from other instances
  const handleClearBroadcast = useCallback((payload: { type: string; event: string; payload: { userId: string } }) => {
    if (payload.payload?.userId !== userId) return;
    
    logger.info('Received clear chat broadcast from another instance', { userId }, { module: 'chat-sync' });
    
    // Clear local state without triggering another broadcast
    setMessages([]);
  }, [userId, setMessages]);
  
  // Handle broadcast "typing status" event from other instances
  const handleTypingBroadcast = useCallback((payload: { type: string; event: string; payload: { userId: string; isTyping: boolean } }) => {
    if (payload.payload?.userId !== userId) return;
    
    logger.debug('Received typing status broadcast from another instance', { 
      userId, 
      isTyping: payload.payload.isTyping 
    }, { module: 'chat-sync' });
    
    // Update local loading state
    setIsLoading(payload.payload.isTyping);
  }, [userId, setIsLoading]);
  
  // Set up realtime subscription
  useEffect(() => {
    if (!userId) {
      logger.debug('Chat sync disabled: no user ID', {}, { module: 'chat-sync' });
      return;
    }
    
    logger.info('Setting up chat sync subscription', { userId }, { module: 'chat-sync' });
    
    // Postgres changes channel for INSERT/DELETE
    const channel = supabase
      .channel(`active-chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_chat_messages',
          filter: `user_id=eq.${userId}`
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_chat_messages',
          filter: `user_id=eq.${userId}`
        },
        handleDelete
      )
      .subscribe((status) => {
        logger.debug('Chat sync subscription status', { status }, { module: 'chat-sync' });
      });
    
    channelRef.current = channel;
    
    // Broadcast channel for clear chat and typing status events
    const broadcastChannel = supabase
      .channel(`chat-broadcast-${userId}`)
      .on('broadcast', { event: 'clear-chat' }, handleClearBroadcast)
      .on('broadcast', { event: 'typing-status' }, handleTypingBroadcast)
      .subscribe((status) => {
        logger.debug('Chat broadcast subscription status', { status }, { module: 'chat-sync' });
      });
    
    broadcastChannelRef.current = broadcastChannel;
    
    return () => {
      logger.debug('Cleaning up chat sync subscription', { userId }, { module: 'chat-sync' });
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, [userId, handleInsert, handleDelete, handleClearBroadcast, handleTypingBroadcast]);
  
  return null;
};

// Export function to broadcast clear chat event
export const broadcastClearChat = async (userId: string) => {
  const channel = supabase.channel(`chat-broadcast-${userId}`);
  await channel.subscribe();
  await channel.send({
    type: 'broadcast',
    event: 'clear-chat',
    payload: { userId }
  });
  // Clean up the temporary channel
  await supabase.removeChannel(channel);
  logger.info('Broadcasted clear chat event', { userId }, { module: 'chat-sync' });
};

// Export function to broadcast typing status
export const broadcastTypingStatus = async (userId: string, isTyping: boolean) => {
  const channel = supabase.channel(`chat-broadcast-${userId}`);
  await channel.subscribe();
  await channel.send({
    type: 'broadcast',
    event: 'typing-status',
    payload: { userId, isTyping }
  });
  // Clean up the temporary channel
  await supabase.removeChannel(channel);
  logger.debug('Broadcasted typing status', { userId, isTyping }, { module: 'chat-sync' });
};
