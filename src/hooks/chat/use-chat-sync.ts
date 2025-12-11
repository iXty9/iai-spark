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
  isBulkOperation
}: UseChatSyncOptions) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
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
  
  // Handle DELETE events (clear chat from another instance)
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
  
  // Set up realtime subscription
  useEffect(() => {
    if (!userId) {
      logger.debug('Chat sync disabled: no user ID', {}, { module: 'chat-sync' });
      return;
    }
    
    logger.info('Setting up chat sync subscription', { userId }, { module: 'chat-sync' });
    
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
    
    return () => {
      logger.debug('Cleaning up chat sync subscription', { userId }, { module: 'chat-sync' });
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, handleInsert, handleDelete]);
  
  return null;
};
