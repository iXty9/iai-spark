
// If this file is read-only, please let me know and I'll create a new service instead

import { Message } from '@/types/chat';

export type SendMessageParams = {
  message: string;
  onMessageStart?: (message: Message) => void;
  onMessageStream?: (chunk: string) => void;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send a message to the chat service
 */
export const sendMessage = async ({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError
}: SendMessageParams): Promise<Message> => {
  try {
    console.log('Sending message:', message);
    
    // Generate a unique ID for this message
    const messageId = `msg_${Date.now()}`;
    
    // Create the initial user message
    const userMessage: Message = {
      id: `user_${messageId}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    // Create the initial assistant message
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    
    // Notify that the message has started
    if (onMessageStart) {
      onMessageStart(assistantMessage);
    }

    // In a real implementation, this would be a fetch to your backend
    await delay(500); // Simulate network delay
    
    // Simulate streaming by sending chunks of the response
    const responseChunks = generateFakeResponse(message);
    let accumulatedContent = '';

    for (const chunk of responseChunks) {
      await delay(50); // Delay between chunks
      
      accumulatedContent += chunk;
      
      if (onMessageStream) {
        onMessageStream(chunk);
      }
    }
    
    // Update the assistant message with the full content
    assistantMessage.content = accumulatedContent;
    assistantMessage.isLoading = false;
    
    // Notify that the message is complete
    if (onMessageComplete) {
      onMessageComplete(assistantMessage);
    }
    
    return assistantMessage;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    
    if (onError) {
      onError(error as Error);
    }
    
    // Return a fallback message on error
    return {
      id: `error_${Date.now()}`,
      role: 'assistant',
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      timestamp: new Date().toISOString(),
      isError: true,
    };
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
