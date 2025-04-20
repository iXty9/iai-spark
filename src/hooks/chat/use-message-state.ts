
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

export const useMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const addMessage = (newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
  };

  const clearMessages = () => {
    if (messages.length === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    setMessages([]);
    toast.success('Chat history cleared');
  };

  return {
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages
  };
};
