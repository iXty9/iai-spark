
import { Message } from '@/types/chat';
import { toast } from 'sonner';

/**
 * Custom JSON reviver function to handle serialized Date objects
 */
const dateReviver = (key: string, value: any) => {
  // Check if the value is a serialized Date object
  if (value && typeof value === 'object' && value.__type === 'Date' && value.iso) {
    return new Date(value.iso);
  }
  
  // Handle older format where dates were stored as strings
  if (key === 'timestamp' && typeof value === 'string') {
    return new Date(value);
  }
  
  return value;
};

/**
 * Validates that a message has the required structure
 */
const isValidMessage = (msg: any): boolean => {
  return msg && 
    typeof msg === 'object' && 
    msg.id && 
    msg.content !== undefined && 
    msg.sender && 
    msg.timestamp;
};

export const importChat = (file: File): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const jsonData = JSON.parse(jsonContent, dateReviver);
        
        // Handle both old format (array of messages) and new format (object with metadata)
        let messages: any[];
        
        if (Array.isArray(jsonData)) {
          // Old format
          messages = jsonData;
        } else if (jsonData.messages && Array.isArray(jsonData.messages)) {
          // New format with metadata
          messages = jsonData.messages;
        } else {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        if (!Array.isArray(messages)) {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        // Validate each message and fix timestamps
        const validMessages: Message[] = [];
        for (const msg of messages) {
          if (isValidMessage(msg)) {
            // Ensure timestamp is a Date object
            const timestamp = msg.timestamp instanceof Date 
              ? msg.timestamp 
              : new Date(msg.timestamp);
            
            validMessages.push({
              ...msg,
              timestamp
            });
          } else {
            console.warn('Skipping invalid message in imported file', msg);
          }
        }
        
        if (validMessages.length === 0) {
          toast.error('No valid messages found in chat file');
          throw new Error('No valid messages found in chat file');
        }

        // Show success toast
        toast.success(`Successfully imported ${validMessages.length} messages`);
        
        resolve(validMessages);
      } catch (error) {
        console.error('Failed to import chat file:', error);
        toast.error('Failed to import chat file');
        reject(error);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read chat file');
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
