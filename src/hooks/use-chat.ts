
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as MessageType } from '@/types/chat';
import { sendMessage, exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';

export const useChat = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;

    // Add user message
    const userMessage: MessageType = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage(''); // Clear input
    setIsLoading(true);
    
    // Add a timeout warning after 60 seconds
    const timeoutWarning = setTimeout(() => {
      toast.info("Ixty AI is still thinking. This might take a moment...");
    }, 60000);

    try {
      // Send to API and get response
      const aiResponse = await sendMessage(message);
      
      // Add AI response message
      const aiMessage: MessageType = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get a response. Please try again.');
    } finally {
      clearTimeout(timeoutWarning);
      setIsLoading(false);
    }
  }, [message]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    exportChat(messages);
    toast.success('Chat exported successfully');
  }, [messages]);

  const startChat = useCallback((initialMessage: string) => {
    // First, update the message state
    setMessage(initialMessage);
    
    // Then submit the message directly without timeout
    // This will immediately process the message and transition to chat view
    handleSubmit();
  }, [handleSubmit]);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  };
};
