
import { Message } from '@/types/chat';

/**
 * Custom JSON replacer function to properly handle Date objects
 */
const dateReplacer = (key: string, value: any) => {
  if (value instanceof Date) {
    return {
      __type: 'Date',
      iso: value.toISOString()
    };
  }
  return value;
};

export const exportChat = (messages: Message[]): void => {
  try {
    // Add metadata and convert messages to a JSON string with proper date handling
    const exportData = {
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        messageCount: messages.length
      },
      messages: messages
    };
    
    const chatData = JSON.stringify(exportData, dateReplacer, 2);
    
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
