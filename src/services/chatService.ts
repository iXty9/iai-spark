
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';

export type SendMessageParams = {
  message: string;
  onMessageStart?: (message: Message) => void;
  onMessageStream?: (chunk: string) => void;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
  isAuthenticated?: boolean;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const AUTHENTICATED_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';
const ANONYMOUS_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';

/**
 * Send a message to the chat service
 */
export const sendMessage = async ({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError,
  isAuthenticated = false
}: SendMessageParams): Promise<Message> => {
  let canceled = false;
  
  try {
    console.log('Sending message to service:', message, 'isAuthenticated:', isAuthenticated);
    emitDebugEvent({
      lastAction: 'API: Starting to process message',
      isLoading: true
    });
    
    // Generate a unique ID for this message
    const messageId = `msg_${Date.now()}`;
    
    // Create the initial user message
    const userMessage: Message = {
      id: `user_${messageId}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    // Create the initial assistant message
    const assistantMessage: Message = {
      id: messageId,
      sender: 'ai',
      content: '',
      timestamp: new Date(),
      pending: true,
    };
    
    // Notify that the message has started
    if (onMessageStart) {
      onMessageStart(assistantMessage);
    }

    // Determine which webhook URL to use based on authentication status
    const webhookUrl = isAuthenticated ? AUTHENTICATED_WEBHOOK_URL : ANONYMOUS_WEBHOOK_URL;
    
    console.log(`Using webhook URL for ${isAuthenticated ? 'authenticated' : 'anonymous'} user:`, webhookUrl);
    
    try {
      // Make the actual API call to the webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
          isAuthenticated: isAuthenticated
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`);
      }
      
      // Check if request was canceled during fetch
      if (canceled) {
        emitDebugEvent({
          lastAction: 'API: Message sending was canceled',
          isLoading: false
        });
        throw new Error('Message sending was canceled');
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Webhook response:', data);
      
      // In case the webhook doesn't return a proper response format,
      // fallback to a default message
      const responseText = data.response || data.message || data.content || 
        "I received your message, but I'm not sure how to respond to that.";
      
      // For streaming simulation (replace with actual streaming if the API supports it)
      const responseChunks = responseText.split(' ').map(word => word + ' ');
      let accumulatedContent = '';
      
      for (const chunk of responseChunks) {
        if (canceled) {
          emitDebugEvent({
            lastAction: 'API: Message streaming was canceled',
            isLoading: false
          });
          throw new Error('Message sending was canceled');
        }
        
        await delay(50); // Delay between chunks
        
        accumulatedContent += chunk;
        
        if (onMessageStream) {
          onMessageStream(chunk);
        }
      }
      
      // Update the assistant message with the full content
      assistantMessage.content = accumulatedContent;
      assistantMessage.pending = false;
      
      emitDebugEvent({
        lastAction: 'API: Message completed successfully',
        isLoading: false
      });
      
      // Notify that the message is complete
      if (onMessageComplete) {
        onMessageComplete(assistantMessage);
      }
      
      return assistantMessage;
      
    } catch (error) {
      console.error('Error calling webhook:', error);
      
      // If the webhook fails, fall back to the generateFakeResponse function
      console.log('Falling back to fake response generation');
      
      // Simulate streaming by sending chunks of the response
      const responseChunks = generateFakeResponse(message);
      let accumulatedContent = '';

      for (const chunk of responseChunks) {
        if (canceled) {
          emitDebugEvent({
            lastAction: 'API: Message streaming was canceled',
            isLoading: false
          });
          throw new Error('Message sending was canceled');
        }
        
        await delay(50); // Delay between chunks
        
        accumulatedContent += chunk;
        
        if (onMessageStream) {
          onMessageStream(chunk);
        }
      }
      
      // Update the assistant message with the full content
      assistantMessage.content = accumulatedContent;
      assistantMessage.pending = false;
      
      emitDebugEvent({
        lastAction: 'API: Message completed with fallback response',
        isLoading: false
      });
      
      // Notify that the message is complete
      if (onMessageComplete) {
        onMessageComplete(assistantMessage);
      }
      
      return assistantMessage;
    }
  } catch (error) {
    console.error('Error in sendMessage:', error);
    
    emitDebugEvent({
      lastError: error instanceof Error ? `API Error: ${error.message}` : 'Unknown API error',
      isLoading: false
    });
    
    if (onError && error instanceof Error) {
      onError(error);
    } else if (onError) {
      onError(new Error('Unknown error occurred'));
    }
    
    // Return a fallback message on error
    return {
      id: `error_${Date.now()}`,
      sender: 'ai',
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      timestamp: new Date(),
      metadata: { error: true }
    };
  }
  
  // Cleanup function to allow for cancellation
  return {
    cancel: () => {
      canceled = true;
      emitDebugEvent({
        lastAction: 'API: Message sending was canceled by user',
        isLoading: false
      });
    }
  } as any;
};

/**
 * Export chat messages to a JSON file
 */
export const exportChat = (messages: Message[]): void => {
  try {
    // Convert messages to a JSON string
    const chatData = JSON.stringify(messages, null, 2);
    
    // Create a blob from the JSON string
    const blob = new Blob([chatData], { type: 'application/json' });
    
    // Create a download URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Append the link to the body, trigger the download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chat:', error);
    throw new Error('Failed to export chat');
  }
};

/**
 * Generate a fake response based on the user's input
 * This is just for demo purposes and would be replaced with actual API calls
 */
function generateFakeResponse(userMessage: string): string[] {
  // Convert message to lowercase for easier matching
  const input = userMessage.toLowerCase();
  
  // Simple pattern matching for demo purposes
  let response: string;
  
  if (input.includes('hello') || input.includes('hi')) {
    response = "Hello! How can I help you today?";
  } else if (input.includes('your name')) {
    response = "I'm Ixty AI, a digital assistant designed to help answer your questions.";
  } else if (input.includes('thank')) {
    response = "You're welcome! Is there anything else I can help you with?";
  } else if (input.includes('weather')) {
    response = "I don't have access to real-time weather data, but I'd be happy to discuss other topics.";
  } else if (input.includes('joke')) {
    response = "Why don't scientists trust atoms? Because they make up everything!";
  } else if (input.includes('time')) {
    response = `I don't have access to your local time, but I'm here to assist you whenever you need.`;
  } else if (input.includes('how are you')) {
    response = "I'm functioning well, thank you for asking! How can I assist you today?";
  } else if (input.includes('help')) {
    response = "I'm here to help! You can ask me questions, chat, or just discuss ideas. What's on your mind?";
  } else {
    response = "I'm here and ready to assist. How can I help you with your questions or tasks today?";
  }
  
  // Break the response into chunks to simulate streaming
  return response.split(' ').map(word => word + ' ');
}
