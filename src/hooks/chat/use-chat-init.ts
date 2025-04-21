
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { sendMessage } from '@/services/chatService';

interface UseChatInitProps {
  user: any;
  authLoading: boolean;
  addMessage: (message: Message) => void;
  setIsLoading: (loading: boolean) => void;
  handleTransitionStart: () => void;
}

export const useChatInit = ({
  user,
  authLoading,
  addMessage,
  setIsLoading,
  handleTransitionStart
}: UseChatInitProps) => {
  const startChat = useCallback(async (initialMessage: string) => {
    if (authLoading) {
      console.warn('Chat start blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      emitDebugEvent({
        lastAction: 'Chat start blocked: Auth still loading',
        lastError: 'Auth loading in progress',
        isLoading: false
      });
      return;
    }

    if (!initialMessage.trim()) {
      console.warn('Chat start blocked: Empty message');
      emitDebugEvent({
        lastAction: 'Chat start blocked: Empty message',
        isLoading: false
      });
      return;
    }

    console.log("Starting new chat using real webhook:", {
      initialMessage,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });

    handleTransitionStart();
    
    try {
      const userMessage = {
        id: uuidv4(),
        content: initialMessage,
        sender: 'user' as const,
        timestamp: new Date()
      };

      addMessage(userMessage);
      setIsLoading(true);

      const response = await sendMessage({
        message: initialMessage,
        isAuthenticated: !!user,
        onError: (error) => {
          console.error('Error in welcome screen AI response:', error);
          emitDebugEvent({
            lastError: `Error in welcome screen AI response: ${error.message}`,
            isLoading: false
          });
        }
      });

      const aiMessage = {
        id: uuidv4(),
        content: response.content,
        sender: 'ai' as const,
        timestamp: new Date()
      };

      addMessage(aiMessage);
      setIsLoading(false);

    } catch (error) {
      console.error('Error in startChat:', error);
      setIsLoading(false);

      const errorMessage = {
        id: uuidv4(),
        content: "I'm sorry, but I encountered an error processing your message. Please try again.",
        sender: 'ai' as const,
        timestamp: new Date(),
        metadata: { error: true }
      };

      addMessage(errorMessage);
      
      emitDebugEvent({
        lastError: error instanceof Error ? error.message : 'Unknown error in startChat',
        isLoading: false,
        isTransitioning: false
      });
    }
  }, [user, authLoading, addMessage, setIsLoading, handleTransitionStart]);

  return { startChat };
};
