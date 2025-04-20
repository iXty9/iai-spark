
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

export const useMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use useCallback for all functions to prevent unnecessary re-renders
  const addMessage = useCallback((newMessage: Message) => {
    console.log('Adding message to state:', {
      id: newMessage.id,
      sender: newMessage.sender,
      timestamp: new Date().toISOString()
    });
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    if (messages.length === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const resetState = useCallback(() => {
    setMessage('');
    setIsLoading(false);
  }, []);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages,
    resetState
  };
};
