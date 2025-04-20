
import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message as MessageType } from '@/types/chat';
import { sendMessage, exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useChat = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const messageListRef = useRef<HTMLDivElement>(null);
  const hasLoadedAuth = useRef(false);
  const messageAttempts = useRef<number>(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!authLoading && !hasLoadedAuth.current) {
      hasLoadedAuth.current = true;
      console.log('Chat auth state loaded:', {
        isAuthenticated: !!user,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, authLoading]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;
    
    if (authLoading) {
      console.warn('Message submission blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      return;
    }

    const userMessage: MessageType = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    console.log('New message created:', {
      messageId: userMessage.id,
      timestamp: userMessage.timestamp,
      contentLength: message.length
    });
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    messageAttempts.current++;
    
    // First warning after 30 seconds if response is still loading
    const firstWarningTimeout = setTimeout(() => {
      console.log('Long response warning triggered');
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { 
        detail: { 
          status: 'responding',
          duration: 30000,
          messageId: userMessage.id
        } 
      }));
    }, 30000);

    try {
      console.log('Sending message:', {
        attempt: messageAttempts.current,
        isAuthenticated: !!user,
        timestamp: new Date().toISOString()
      });
      
      console.time(`messageResponse_${userMessage.id}`);
      const aiResponse = await sendMessage({
        message: message,
        onError: (error) => {
          console.error('Error in AI response:', error);
        }
      });
      console.timeEnd(`messageResponse_${userMessage.id}`);
      
      const aiMessage: MessageType = {
        id: uuidv4(),
        content: aiResponse.content,
        sender: 'ai',
        timestamp: new Date()
      };
      
      console.log('AI response received:', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: aiResponse.content.length
      });
      
      setMessages(prev => [...prev, aiMessage]);
      messageAttempts.current = 0;
    } catch (error) {
      console.error('Error getting AI response:', {
        error,
        attempt: messageAttempts.current,
        messageId: userMessage.id
      });
      
      // Implement retry logic for specific errors
      if (messageAttempts.current < maxRetries && error instanceof Error && 
          !error.message.includes('abort')) {
        console.log('Scheduling message retry...');
        setTimeout(() => {
          handleSubmit();
        }, Math.pow(2, messageAttempts.current) * 1000);
        return;
      }
      
      toast.error('Failed to get a response. Please try again.');
    } finally {
      clearTimeout(firstWarningTimeout);
      setIsLoading(false);
    }
  }, [message, user, authLoading]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    
    console.log('Clearing chat history:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    setMessages([]);
    toast.success('Chat history cleared');
  }, [messages.length]);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      console.warn('Export attempted with no messages');
      toast.error('No messages to export');
      return;
    }
    
    console.log('Exporting chat:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    exportChat(messages);
    toast.success('Chat exported successfully');
  }, [messages]);

  const startChat = useCallback((initialMessage: string) => {
    if (authLoading) {
      console.warn('Chat start blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      return;
    }
    
    console.log("Starting new chat:", {
      initialMessage,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
    
    const userMessage: MessageType = {
      id: uuidv4(),
      content: initialMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages([userMessage]);
    setIsLoading(true);
    messageAttempts.current++;
    
    const firstWarningTimeout = setTimeout(() => {
      console.log('Long response warning triggered in startChat');
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
      window.dispatchEvent(new CustomEvent('aiResponseStatus', {
        detail: {
          status: 'responding',
          duration: 30000,
          messageId: userMessage.id
        }
      }));
    }, 30000);
    
    console.time(`initialResponse_${userMessage.id}`);
    sendMessage({
      message: initialMessage,
      onError: (error) => {
        console.error('Error in initial AI response:', error);
      }
    })
      .then(aiResponse => {
        console.timeEnd(`initialResponse_${userMessage.id}`);
        
        const aiMessage: MessageType = {
          id: uuidv4(),
          content: aiResponse.content,
          sender: 'ai',
          timestamp: new Date()
        };
        
        console.log('Initial AI response received:', {
          messageId: aiMessage.id,
          responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
          contentLength: aiResponse.content.length
        });
        
        setMessages(prev => [...prev, aiMessage]);
        messageAttempts.current = 0;
      })
      .catch(error => {
        console.error('Error in initial AI response:', {
          error,
          attempt: messageAttempts.current,
          messageId: userMessage.id
        });
        
        if (messageAttempts.current < maxRetries && error instanceof Error && 
            !error.message.includes('abort')) {
          console.log('Scheduling initial message retry...');
          setTimeout(() => {
            startChat(initialMessage);
          }, Math.pow(2, messageAttempts.current) * 1000);
          return;
        }
        
        toast.error('Failed to get a response. Please try again.');
      })
      .finally(() => {
        clearTimeout(firstWarningTimeout);
        setIsLoading(false);
      });
  }, [user, authLoading]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('Chat state updated:', {
      messageCount: messages.length,
      isLoading,
      authLoading,
      hasLoadedAuth: hasLoadedAuth.current,
      timestamp: new Date().toISOString()
    });
  }, [messages.length, isLoading, authLoading]);

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
