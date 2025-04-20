
import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';

export const useChatSubmit = (
  message: string,
  setMessage: (msg: string) => void,
  addMessage: (msg: Message) => void,
  setIsLoading: (loading: boolean) => void,
  isAuthenticated: boolean,
  isAuthLoading: boolean
) => {
  const messageAttempts = useRef<number>(0);
  const maxRetries = 3;

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;
    
    if (isAuthLoading) {
      console.warn('Message submission blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      return;
    }

    const userMessage: Message = {
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
    
    addMessage(userMessage);
    setMessage('');
    setIsLoading(true);
    messageAttempts.current++;
    
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
        isAuthenticated,
        timestamp: new Date().toISOString()
      });
      
      console.time(`messageResponse_${userMessage.id}`);
      const response = await sendMessage({
        message: userMessage.content,
        onError: (error) => {
          console.error('Error in AI response:', error);
        }
      });
      console.timeEnd(`messageResponse_${userMessage.id}`);
      
      const aiMessage: Message = {
        id: uuidv4(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      };
      
      console.log('AI response received:', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: response.content.length
      });
      
      addMessage(aiMessage);
      messageAttempts.current = 0;
    } catch (error) {
      console.error('Error getting AI response:', {
        error,
        attempt: messageAttempts.current,
        messageId: userMessage.id
      });
      
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
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading]);

  return { handleSubmit };
};
