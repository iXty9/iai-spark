
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: Message) => {
    console.log('Adding message to state:', {
      id: message.id,
      sender: message.sender,
      keys: Object.keys(message),
      hasTokenInfo: !!message.tokenInfo,
      hasThreadId: !!message.threadId,
      hasRawRequest: !!message.rawRequest
    });
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const createUserMessage = useCallback((content: string): Message => {
    return {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
  }, []);

  const createErrorMessage = useCallback((errorText: string): Message => {
    return {
      id: uuidv4(),
      content: errorText,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      metadata: { error: true }
    };
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    clearMessages,
    createUserMessage,
    createErrorMessage
  };
};
