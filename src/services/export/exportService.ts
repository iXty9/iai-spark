
import { Message } from '@/types/chat';

/**
 * Enhanced export format that preserves all message data including verbatim webhook responses
 */
interface EnhancedExportData {
  metadata: {
    version: string;
    format: 'enhanced' | 'legacy';
    exportDate: string;
    messageCount: number;
    description: string;
  };
  messages: EnhancedMessageExport[];
}

interface EnhancedMessageExport {
  // Core message fields
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: {
    __type: 'Date';
    iso: string;
  };
  pending?: boolean;
  
  // Enhanced fields for complete data preservation
  rawResponse?: any; // Verbatim webhook response
  tokenInfo?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    threadId?: string;
  };
  threadId?: string;
  metadata?: Record<string, any>;
}

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

/**
 * Converts a Message to the enhanced export format
 */
const convertToEnhancedFormat = (message: Message): EnhancedMessageExport => {
  return {
    id: message.id,
    content: message.content,
    sender: message.sender,
    timestamp: {
      __type: 'Date',
      iso: message.timestamp.toISOString()
    },
    ...(message.pending && { pending: message.pending }),
    ...(message.rawResponse && { rawResponse: message.rawResponse }),
    ...(message.tokenInfo && { tokenInfo: message.tokenInfo }),
    ...(message.threadId && { threadId: message.threadId }),
    ...(message.metadata && { metadata: message.metadata })
  };
};

export const exportChat = (messages: Message[]): void => {
  try {
    // Create enhanced export data with complete message preservation
    const exportData: EnhancedExportData = {
      metadata: {
        version: '2.0',
        format: 'enhanced',
        exportDate: new Date().toISOString(),
        messageCount: messages.length,
        description: 'Enhanced chat export with verbatim webhook responses and complete token information'
      },
      messages: messages.map(convertToEnhancedFormat)
    };
    
    const chatData = JSON.stringify(exportData, dateReplacer, 2);
    
    // Create a blob from the JSON string
    const blob = new Blob([chatData], { type: 'application/json' });
    
    // Create a download URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-enhanced-${new Date().toISOString().split('T')[0]}.json`;
    
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
