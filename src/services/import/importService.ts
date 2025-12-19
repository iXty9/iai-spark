
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { logger } from '@/utils/logging';
import { clearActiveMessages, bulkInsertActiveMessages } from '@/services/chat/active-chat-service';

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
  logger.debug('Converting enhanced message', {
    id: enhancedMsg.id,
    hasTokenInfo: !!enhancedMsg.tokenInfo,
    hasThreadId: !!enhancedMsg.threadId
  }, { module: 'import-service' });

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

  logger.debug('Final converted message', {
    id: message.id,
    hasTokenInfo: !!message.tokenInfo,
    hasThreadId: !!message.threadId
  }, { module: 'import-service' });

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

/**
 * Parse and validate messages from imported file
 * Returns only the last 100 messages
 */
const parseImportedMessages = (file: File): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const jsonData = JSON.parse(jsonContent, dateReviver);
        
        logger.debug('Import: Raw JSON data parsed', {
          hasMetadata: !!jsonData.metadata,
          format: jsonData.metadata?.format,
          messageCount: jsonData.messages?.length || jsonData.length
        }, { module: 'import-service' });
        
        // Detect and handle different formats
        const format = detectImportFormat(jsonData);
        let messages: any[];
        
        switch (format) {
          case 'enhanced':
            messages = jsonData.messages;
            logger.debug('Import: Detected enhanced format', undefined, { module: 'import-service' });
            break;
          case 'legacy_with_metadata':
            messages = jsonData.messages;
            logger.debug('Import: Detected legacy with metadata format', undefined, { module: 'import-service' });
            break;
          case 'legacy_array':
            messages = jsonData;
            logger.debug('Import: Detected legacy array format', undefined, { module: 'import-service' });
            break;
          default:
            throw new Error('Unsupported import format');
        }
        
        if (!Array.isArray(messages)) {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        logger.debug('Import: Processing messages', {
          count: messages.length,
          sampleMessage: messages[0] ? {
            id: messages[0].id,
            hasTokenInfo: !!messages[0].tokenInfo,
            hasThreadId: !!messages[0].threadId
          } : null
        }, { module: 'import-service' });
        
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
              logger.warn('Skipping invalid message in imported file', { msg }, { module: 'import-service' });
            }
          } catch (error) {
            logger.error('Error processing message from import', error, { module: 'import-service' });
          }
        }
        
        if (validMessages.length === 0) {
          toast.error('No valid messages found in chat file');
          throw new Error('No valid messages found in chat file');
        }

        // Take only the last 100 messages
        const limitedMessages = validMessages.slice(-100);
        
        logger.info('Import successful', {
          format,
          originalCount: validMessages.length,
          limitedCount: limitedMessages.length,
          hasTokenInfo: limitedMessages.filter(m => m.tokenInfo).length,
          hasRawRequest: limitedMessages.filter(m => m.rawRequest).length
        }, { module: 'import-service' });
        
        resolve(limitedMessages);
      } catch (error) {
        logger.error('Failed to import chat file', error, { module: 'import-service' });
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

/**
 * Import chat messages (anonymous users - localStorage only)
 */
export const importChat = (file: File): Promise<Message[]> => {
  return parseImportedMessages(file).then(messages => {
    toast.success(`Successfully imported ${messages.length} messages`);
    return messages;
  });
};

/**
 * Import chat messages with Supabase sync (authenticated users)
 * Clears existing messages and replaces with imported ones
 */
export const importChatWithSync = async (
  file: File,
  userId: string,
  isBulkOperation: React.MutableRefObject<boolean>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<Message[]> => {
  try {
    // Set bulk operation flag to suppress realtime events during import
    isBulkOperation.current = true;
    
    // Parse the imported messages
    const messages = await parseImportedMessages(file);
    
    // Clear existing messages from Supabase
    await clearActiveMessages(userId);
    
    // Set local state immediately
    setMessages(messages);
    
    // Bulk insert to Supabase (sanitized, only last 100)
    const success = await bulkInsertActiveMessages(userId, messages);
    
    if (success) {
      toast.success(`Successfully imported ${messages.length} messages`);
    } else {
      toast.warning(`Imported ${messages.length} messages locally, but sync failed`);
    }
    
    logger.info('Chat import with sync completed', {
      userId,
      messageCount: messages.length,
      syncSuccess: success
    }, { module: 'import-service' });
    
    return messages;
  } finally {
    // Reset bulk operation flag after a short delay to let realtime events settle
    setTimeout(() => {
      isBulkOperation.current = false;
    }, 500);
  }
};
