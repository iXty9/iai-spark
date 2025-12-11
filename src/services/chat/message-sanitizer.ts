import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

/**
 * Regex pattern to match [attachment] blocks with Base64 data
 * Matches: [attachment name="...\" mime="...\" data=\"base64..."][/attachment]
 */
const ATTACHMENT_PATTERN = /\[attachment\s+name="([^"]+)"\s+mime="([^"]+)"\s+data="[^"]+"]\[\/attachment]/g;

/**
 * Sanitizes message content by replacing Base64 data with placeholder
 * Keeps the attachment block structure but removes the heavy data
 */
export const sanitizeMessageContent = (content: string): string => {
  return content.replace(
    ATTACHMENT_PATTERN,
    '[attachment name="$1" mime="$2" data="[image removed for sync]"][/attachment]'
  );
};

/**
 * Extracts only essential metadata fields for Supabase storage
 * Strips rawRequest, rawResponse, and other heavy fields
 */
export const sanitizeMessageMetadata = (message: Message): Record<string, any> | undefined => {
  const sanitized: Record<string, any> = {};
  
  // Keep tokenInfo if present (small, useful)
  if (message.tokenInfo) {
    sanitized.tokenInfo = message.tokenInfo;
  }
  
  // Keep threadId if present
  if (message.threadId) {
    sanitized.threadId = message.threadId;
  }
  
  // Keep tokens if present (alternative token format)
  if (message.tokens) {
    sanitized.tokens = message.tokens;
  }
  
  // Keep error flag from metadata
  if (message.metadata?.error) {
    sanitized.error = message.metadata.error;
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

/**
 * Sanitizes a message for Supabase storage
 * - Removes Base64 data from content
 * - Strips rawRequest/rawResponse
 * - Keeps only essential metadata
 */
export const sanitizeMessageForSync = (message: Message): {
  message_id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  source: string | undefined;
  metadata: Record<string, any> | undefined;
} => {
  const sanitizedContent = sanitizeMessageContent(message.content);
  const sanitizedMetadata = sanitizeMessageMetadata(message);
  
  logger.debug('Sanitized message for sync', {
    messageId: message.id,
    originalContentLength: message.content.length,
    sanitizedContentLength: sanitizedContent.length,
    hadBase64: message.content.length !== sanitizedContent.length,
    strippedRawRequest: !!message.rawRequest,
    strippedRawResponse: !!message.rawResponse
  }, { module: 'message-sanitizer' });
  
  return {
    message_id: message.id,
    sender: message.sender,
    content: sanitizedContent,
    timestamp: message.timestamp,
    source: message.source,
    metadata: sanitizedMetadata
  };
};

/**
 * Converts a database row back to Message format
 */
export const dbRowToMessage = (row: {
  message_id: string;
  sender: string;
  content: string;
  timestamp: string;
  source: string | null;
  metadata: Record<string, any> | null;
}): Message => {
  const message: Message = {
    id: row.message_id,
    sender: row.sender as 'user' | 'ai',
    content: row.content,
    timestamp: row.timestamp
  };
  
  if (row.source) {
    message.source = row.source as 'user' | 'ai' | 'proactive';
  }
  
  // Restore metadata fields
  if (row.metadata) {
    if (row.metadata.tokenInfo) {
      message.tokenInfo = row.metadata.tokenInfo;
    }
    if (row.metadata.threadId) {
      message.threadId = row.metadata.threadId;
    }
    if (row.metadata.tokens) {
      message.tokens = row.metadata.tokens;
    }
    if (row.metadata.error) {
      message.metadata = { error: row.metadata.error };
    }
  }
  
  return message;
};
