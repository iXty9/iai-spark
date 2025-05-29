
import { Message } from '@/types/chat';
import { toast } from 'sonner';

/**
 * Custom JSON reviver function to handle serialized Date objects
 */
const dateReviver = (key: string, value: any) => {
  // Check if the value is a serialized Date object (new format)
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
 * Validates that a message has the required structure for any format
 */
const isValidMessage = (msg: any): boolean => {
  return msg && 
    typeof msg === 'object' && 
    msg.id && 
    msg.content !== undefined && 
    msg.sender && 
    msg.timestamp;
};

/**
 * Converts enhanced export format message to standard Message format
 */
const convertFromEnhancedFormat = (enhancedMsg: any): Message => {
  const message: Message = {
    id: enhancedMsg.id,
    content: enhancedMsg.content,
    sender: enhancedMsg.sender,
    timestamp: enhancedMsg.timestamp instanceof Date ? enhancedMsg.timestamp : new Date(enhancedMsg.timestamp),
  };

  // Add optional fields if they exist
  if (enhancedMsg.pending !== undefined) {
    message.pending = enhancedMsg.pending;
  }
  
  if (enhancedMsg.rawResponse) {
    message.rawResponse = enhancedMsg.rawResponse;
  }
  
  if (enhancedMsg.tokenInfo) {
    message.tokenInfo = enhancedMsg.tokenInfo;
  }
  
  if (enhancedMsg.threadId) {
    message.threadId = enhancedMsg.threadId;
  }
  
  if (enhancedMsg.metadata) {
    message.metadata = enhancedMsg.metadata;
  }

  return message;
};

/**
 * Determines the format of the imported data
 */
const detectImportFormat = (data: any): 'enhanced' | 'legacy_with_metadata' | 'legacy_array' => {
  if (data.metadata && data.metadata.format === 'enhanced') {
    return 'enhanced';
  } else if (data.messages && Array.isArray(data.messages)) {
    return 'legacy_with_metadata';
  } else if (Array.isArray(data)) {
    return 'legacy_array';
  }
  throw new Error('Unknown import format');
};

export const importChat = (file: File): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const jsonData = JSON.parse(jsonContent, dateReviver);
        
        // Detect and handle different formats
        const format = detectImportFormat(jsonData);
        let messages: any[];
        let formatDescription = '';
        
        switch (format) {
          case 'enhanced':
            messages = jsonData.messages;
            formatDescription = 'Enhanced format with verbatim data';
            break;
          case 'legacy_with_metadata':
            messages = jsonData.messages;
            formatDescription = 'Legacy format with metadata';
            break;
          case 'legacy_array':
            messages = jsonData;
            formatDescription = 'Legacy array format';
            break;
          default:
            throw new Error('Unsupported import format');
        }
        
        if (!Array.isArray(messages)) {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        // Validate and convert each message
        const validMessages: Message[] = [];
        for (const msg of messages) {
          try {
            if (isValidMessage(msg)) {
              let convertedMessage: Message;
              
              if (format === 'enhanced') {
                // Use enhanced conversion to preserve all fields
                convertedMessage = convertFromEnhancedFormat(msg);
              } else {
                // Legacy conversion
                convertedMessage = {
                  ...msg,
                  timestamp: msg.timestamp instanceof Date 
                    ? msg.timestamp 
                    : new Date(msg.timestamp)
                };
              }
              
              validMessages.push(convertedMessage);
            } else {
              console.warn('Skipping invalid message in imported file', msg);
            }
          } catch (error) {
            console.error('Error processing message from import', error);
          }
        }
        
        if (validMessages.length === 0) {
          toast.error('No valid messages found in chat file');
          throw new Error('No valid messages found in chat file');
        }

        // Show success toast with format information
        toast.success(`Successfully imported ${validMessages.length} messages (${formatDescription})`);
        
        console.log('Import successful:', {
          format,
          messageCount: validMessages.length,
          hasTokenInfo: validMessages.some(m => m.tokenInfo),
          hasRawResponse: validMessages.some(m => m.rawResponse)
        });
        
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
