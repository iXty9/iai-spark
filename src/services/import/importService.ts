
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { logger } from '@/utils/logging';

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
  console.log('Converting enhanced message:', {
    id: enhancedMsg.id,
    hasTokenInfo: !!enhancedMsg.tokenInfo,
    hasThreadId: !!enhancedMsg.threadId,
    hasRawRequest: !!enhancedMsg.rawRequest,
    timestampType: typeof enhancedMsg.timestamp,
    timestamp: enhancedMsg.timestamp
  });

  // Handle timestamp conversion properly
  let timestamp: string;
  if (enhancedMsg.timestamp && typeof enhancedMsg.timestamp === 'object' && enhancedMsg.timestamp.__type === 'Date') {
    // Enhanced format with { __type: 'Date', iso: string }
    timestamp = enhancedMsg.timestamp.iso;
  } else if (typeof enhancedMsg.timestamp === 'string') {
    // Legacy string format
    timestamp = enhancedMsg.timestamp;
  } else if (enhancedMsg.timestamp instanceof Date) {
    // Date object
    timestamp = enhancedMsg.timestamp.toISOString();
  } else {
    // Fallback
    timestamp = new Date().toISOString();
  }

  const message: Message = {
    id: enhancedMsg.id,
    content: enhancedMsg.content,
    sender: enhancedMsg.sender,
    timestamp: timestamp,
  };

  // Preserve ALL optional fields including enhanced data
  if (enhancedMsg.pending !== undefined) {
    message.pending = enhancedMsg.pending;
  }
  
  if (enhancedMsg.source !== undefined) {
    message.source = enhancedMsg.source;
  }
  
  if (enhancedMsg.rawRequest) {
    message.rawRequest = enhancedMsg.rawRequest;
    logger.debug('Preserved rawRequest in import', { messageId: message.id }, { module: 'import-service' });
  }
  
  if (enhancedMsg.rawResponse) {
    message.rawResponse = enhancedMsg.rawResponse;
    logger.debug('Preserved rawResponse in import', { messageId: message.id }, { module: 'import-service' });
  }
  
  if (enhancedMsg.tokenInfo) {
    message.tokenInfo = enhancedMsg.tokenInfo;
    logger.debug('Preserved tokenInfo in import', { messageId: message.id, tokenInfo: enhancedMsg.tokenInfo }, { module: 'import-service' });
  }
  
  if (enhancedMsg.threadId) {
    message.threadId = enhancedMsg.threadId;
    logger.debug('Preserved threadId in import', { messageId: message.id, threadId: enhancedMsg.threadId }, { module: 'import-service' });
  }
  
  if (enhancedMsg.metadata) {
    message.metadata = enhancedMsg.metadata;
  }

  console.log('Final converted message:', {
    id: message.id,
    hasTokenInfo: !!message.tokenInfo,
    hasThreadId: !!message.threadId,
    hasRawRequest: !!message.rawRequest,
    keys: Object.keys(message)
  });

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
        
        console.log('Import: Raw JSON data parsed:', {
          hasMetadata: !!jsonData.metadata,
          format: jsonData.metadata?.format,
          messageCount: jsonData.messages?.length || jsonData.length
        });
        
        // Detect and handle different formats
        const format = detectImportFormat(jsonData);
        let messages: any[];
        let formatDescription = '';
        
        switch (format) {
          case 'enhanced':
            messages = jsonData.messages;
            formatDescription = 'Enhanced format with complete webhook data';
            console.log('Import: Detected enhanced format');
            break;
          case 'legacy_with_metadata':
            messages = jsonData.messages;
            formatDescription = 'Legacy format with metadata';
            console.log('Import: Detected legacy with metadata format');
            break;
          case 'legacy_array':
            messages = jsonData;
            formatDescription = 'Legacy array format';
            console.log('Import: Detected legacy array format');
            break;
          default:
            throw new Error('Unsupported import format');
        }
        
        if (!Array.isArray(messages)) {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        console.log('Import: Processing messages:', {
          count: messages.length,
          sampleMessage: messages[0] ? {
            id: messages[0].id,
            hasTokenInfo: !!messages[0].tokenInfo,
            hasThreadId: !!messages[0].threadId,
            keys: Object.keys(messages[0])
          } : null
        });
        
        // Validate and convert each message
        const validMessages: Message[] = [];
        for (const msg of messages) {
          try {
            if (isValidMessage(msg)) {
              let convertedMessage: Message;
              
              if (format === 'enhanced') {
                // Use enhanced conversion to preserve all fields including raw request/response
                convertedMessage = convertFromEnhancedFormat(msg);
              } else {
                // Legacy conversion - preserve existing fields as much as possible
                convertedMessage = {
                  id: msg.id,
                  content: msg.content,
                  sender: msg.sender,
                  timestamp: msg.timestamp instanceof Date 
                    ? msg.timestamp.toISOString() 
                    : msg.timestamp
                };
                
                // Preserve optional fields in legacy format too
                if (msg.pending !== undefined) convertedMessage.pending = msg.pending;
                if (msg.source !== undefined) convertedMessage.source = msg.source;
                if (msg.rawRequest) convertedMessage.rawRequest = msg.rawRequest;
                if (msg.rawResponse) convertedMessage.rawResponse = msg.rawResponse;
                if (msg.tokenInfo) convertedMessage.tokenInfo = msg.tokenInfo;
                if (msg.threadId) convertedMessage.threadId = msg.threadId;
                if (msg.metadata) convertedMessage.metadata = msg.metadata;
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
          hasTokenInfo: validMessages.filter(m => m.tokenInfo).length,
          hasRawRequest: validMessages.filter(m => m.rawRequest).length,
          hasRawResponse: validMessages.filter(m => m.rawResponse).length,
          hasThreadId: validMessages.filter(m => m.threadId).length
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
