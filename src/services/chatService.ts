
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
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.text || 'I didn\'t get a proper response. Please try again.';
  } catch (error) {
    console.error('Error sending message to webhook:', error);
    throw new Error('Failed to communicate with Ixty AI. Please try again later.');
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
