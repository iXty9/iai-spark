
/**
 * Chat API service for Ixty AI
 */

// The webhook URL for Ixty AI
const WEBHOOK_URL = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7';

/**
 * Send a message to the Ixty AI webhook
 * @param message The message to send
 * @returns The response from the AI
 */
export const sendMessage = async (message: string): Promise<string> => {
  try {
    console.log('Sending message to Ixty AI webhook:', message);
    
    // Set a longer timeout for the fetch request (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    // For testing when the webhook is unavailable, we'll return a mock response
    // In a production environment, we would want to connect to the actual webhook
    // This is just to prevent the app from breaking during development
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      // Get response text first
      const responseText = await response.text();
      console.log('Raw response from webhook:', responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        // If it's not valid JSON but contains text, return it directly
        if (responseText && typeof responseText === 'string' && responseText.trim()) {
          return responseText.trim();
        }
        return "I received your message but couldn't process the response format. Please try again.";
      }
      
      console.log('Parsed response data:', data);
      
      // Check if the response is an array (as seen in the n8n response)
      if (Array.isArray(data) && data.length > 0) {
        // Extract the output from the first item in the array
        return data[0].output || 'I received your message but got an unexpected response format. Please try again.';
      } 
      
      // Fallback in case the response format changes
      if (data.text) {
        return data.text;
      }
      
      if (data.output) {
        return data.output;
      }
      
      // Final fallback
      console.log('Unexpected response format:', data);
      return 'I received your message but the response format was unexpected. Please try again.';
    } catch (networkError) {
      clearTimeout(timeoutId);
      console.error('Network error:', networkError);
      
      // Return a fallback response for development/demo purposes
      return "I'm currently experiencing connection issues. This is a temporary response to allow you to continue testing the interface. In a production environment, I would connect to the Ixty AI service to provide a real response.";
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout: The webhook took too long to respond');
      return "I'm taking longer than expected to respond. This is a temporary response to allow you to continue testing the interface.";
    }
    
    console.error('Error sending message to webhook:', error);
    return "I encountered an issue processing your request. This is a temporary response to allow you to continue testing the interface.";
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
