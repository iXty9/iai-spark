import { supabase } from '@/integrations/supabase/client';

/**
 * Chat API service for Ixty AI
 */

// The default webhook URL for Ixty AI (used for guest users)
const DEFAULT_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';

// The webhook URL for authenticated users
const AUTH_WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';

/**
 * Get the appropriate webhook URL based on authentication status and user profile
 */
const getWebhookUrl = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    console.log('User is not authenticated, using DEFAULT_WEBHOOK_URL');
    return DEFAULT_WEBHOOK_URL;
  }
  
  console.log('User is authenticated, using AUTH_WEBHOOK_URL');
  return AUTH_WEBHOOK_URL;
};

interface TokenUsageDetails {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_token_details?: {
    cached_tokens: number;
  };
  completion_tokens_details?: {
    reasoning_tokens: number;
  };
}

interface ApiResponse {
  threadId?: string;
  output: string;
  usage?: TokenUsageDetails;
}

/**
 * Send a message to the Ixty AI webhook
 * @param message The message to send
 * @returns The response from the AI
 */
export const sendMessage = async (message: string): Promise<string> => {
  try {
    console.log('Sending message to Ixty AI webhook:', message);
    
    const webhookUrl = await getWebhookUrl();
    console.log('Using webhook URL:', webhookUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Error response from server: ${response.status} ${response.statusText}`);
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Raw response from webhook:', responseText);
      
      try {
        const data: ApiResponse[] = JSON.parse(responseText);
        console.log('Parsed response data:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          // Dispatch token usage event if available
          if (data[0].usage) {
            const event = new CustomEvent('tokenUsage', { 
              detail: data[0].usage 
            });
            window.dispatchEvent(event);
          }
          return data[0].output || 'I received your message but got an unexpected response format. Please try again.';
        }
        
        // Handle non-array responses (fallback)
        const nonArrayData = data as unknown as ApiResponse;
        if (nonArrayData.output) {
          if (nonArrayData.usage) {
            const event = new CustomEvent('tokenUsage', { 
              detail: nonArrayData.usage 
            });
            window.dispatchEvent(event);
          }
          return nonArrayData.output;
        }
        
        console.log('Unexpected response format:', data);
        return 'I received your message but the response format was unexpected. Please try again.';
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        if (responseText && typeof responseText === 'string' && responseText.trim()) {
          return responseText.trim();
        }
        return "I received your message but couldn't process the response format. Please try again.";
      }
    } catch (networkError) {
      clearTimeout(timeoutId);
      console.error('Network error:', networkError);
      
      if (networkError.name === 'AbortError') {
        return "I'm taking too long to respond. This could be due to network issues or high server load. Please try again in a moment.";
      }
      
      return "I'm currently experiencing connection issues. This might be because of network problems or server availability. Please try again in a few moments.";
    }
  } catch (error) {
    console.error('Error sending message to webhook:', error);
    return "I encountered an issue processing your request. Please check your internet connection and try again.";
  }
};

/**
 * Export chat history as a text file
 * @param messages Array of chat messages
 */
export const exportChat = (messages: any[]): void => {
  // Format messages
  const formattedMessages = messages.map(msg => {
    const sender = msg.sender === 'user' ? 'You' : 'Ixty AI';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    return `[${time}] ${sender}: ${msg.content}`;
  }).join('\n\n');

  // Create blob and download
  const blob = new Blob([formattedMessages], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ixty-chat-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
