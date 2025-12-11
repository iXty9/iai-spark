import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { sanitizeMessageForSync, dbRowToMessage } from './message-sanitizer';
import { logger } from '@/utils/logging';

/**
 * Fetches all active chat messages for a user from Supabase
 */
export const fetchActiveMessages = async (userId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('active_chat_messages')
      .select('message_id, sender, content, timestamp, source, metadata')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      logger.error('Failed to fetch active messages', error, { module: 'active-chat-service' });
      throw error;
    }
    
    const messages = (data || []).map(row => dbRowToMessage(row));
    
    logger.debug('Fetched active messages from Supabase', {
      userId,
      count: messages.length
    }, { module: 'active-chat-service' });
    
    return messages;
  } catch (error) {
    logger.error('Error in fetchActiveMessages', error, { module: 'active-chat-service' });
    return [];
  }
};

/**
 * Inserts a single message to Supabase (sanitized)
 */
export const insertActiveMessage = async (userId: string, message: Message): Promise<boolean> => {
  try {
    const sanitized = sanitizeMessageForSync(message);
    
    const { error } = await supabase
      .from('active_chat_messages')
      .insert({
        user_id: userId,
        message_id: sanitized.message_id,
        sender: sanitized.sender,
        content: sanitized.content,
        timestamp: sanitized.timestamp,
        source: sanitized.source,
        metadata: sanitized.metadata
      });
    
    if (error) {
      // Ignore unique constraint violations (duplicate message from another instance)
      if (error.code === '23505') {
        logger.debug('Duplicate message ignored', { messageId: message.id }, { module: 'active-chat-service' });
        return true;
      }
      logger.error('Failed to insert active message', error, { module: 'active-chat-service' });
      return false;
    }
    
    logger.debug('Inserted active message to Supabase', {
      userId,
      messageId: message.id
    }, { module: 'active-chat-service' });
    
    return true;
  } catch (error) {
    logger.error('Error in insertActiveMessage', error, { module: 'active-chat-service' });
    return false;
  }
};

/**
 * Bulk inserts messages to Supabase (for import operations)
 * Only inserts the last 100 messages
 */
export const bulkInsertActiveMessages = async (userId: string, messages: Message[]): Promise<boolean> => {
  try {
    // Take only the last 100 messages
    const limitedMessages = messages.slice(-100);
    
    // Sanitize all messages
    const sanitizedMessages = limitedMessages.map(msg => ({
      user_id: userId,
      ...sanitizeMessageForSync(msg)
    }));
    
    // Use upsert to handle any duplicates gracefully
    const { error } = await supabase
      .from('active_chat_messages')
      .upsert(sanitizedMessages, {
        onConflict: 'user_id,message_id',
        ignoreDuplicates: true
      });
    
    if (error) {
      logger.error('Failed to bulk insert active messages', error, { module: 'active-chat-service' });
      return false;
    }
    
    logger.info('Bulk inserted active messages to Supabase', {
      userId,
      originalCount: messages.length,
      insertedCount: limitedMessages.length
    }, { module: 'active-chat-service' });
    
    return true;
  } catch (error) {
    logger.error('Error in bulkInsertActiveMessages', error, { module: 'active-chat-service' });
    return false;
  }
};

/**
 * Clears all active messages for a user
 */
export const clearActiveMessages = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('active_chat_messages')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Failed to clear active messages', error, { module: 'active-chat-service' });
      return false;
    }
    
    logger.info('Cleared active messages from Supabase', { userId }, { module: 'active-chat-service' });
    return true;
  } catch (error) {
    logger.error('Error in clearActiveMessages', error, { module: 'active-chat-service' });
    return false;
  }
};
