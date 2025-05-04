
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/utils/markdown-config';
import { useDevMode } from '@/store/use-dev-mode';
import { Message as MessageType } from '@/types/chat';
import DOMPurify from 'dompurify';

interface MessageContentProps {
  message: MessageType;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ message, isUser }) => {
  const { isDevMode } = useDevMode();

  // Update markdown components to include custom link styling
  const customMarkdownComponents = {
    ...markdownComponents,
    a: ({ node, ...props }) => (
      <a 
        {...props} 
        className="underline hover:opacity-80 transition-opacity" 
        style={{ 
          color: 'var(--link-color, var(--primary-color))' 
        }}
        target="_blank"
        rel="noopener noreferrer"
      />
    )
  };

  // Use enhanced styling for both user and AI bubbles
  if (isUser || !isDevMode) {
    if (isUser) {
      // User message: text always left aligned
      return (
        <div className="whitespace-pre-wrap text-base font-medium break-words text-left">
          {message.content}
        </div>
      );
    }
    // AI message: markdown rendering with proper color application and matching text size
    return (
      <div 
        className="markdown-content prose prose-sm max-w-none dark:prose-invert prose-headings:my-2 prose-p:my-1 prose-hr:my-2 text-base font-medium"
        style={{ color: 'inherit' }} // Use inherit to pick up the color from the parent element
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={customMarkdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  // Dev mode: show all message data in a well-styled code block
  const messageData = {
    id: message.id,
    sender: message.sender,
    content: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
    timestamp: message.timestamp,
    rawResponse: message.rawResponse || null,
    tokenInfo: message.tokenInfo || null,
    threadId: message.threadId || null,
    metadata: message.metadata || null,
  };

  // Use DOMPurify but create a new trusted policy for TrustedHTML
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    // Check if policy already exists to avoid errors on re-render
    if (!window.trustedTypes.defaultPolicy) {
      window.trustedTypes.createPolicy('default', {
        createHTML: (string) => string
      });
    }
  }

  const sanitizedJson = DOMPurify.sanitize(
    JSON.stringify(messageData, null, 2)
  );

  return (
    <div>
      <div className="markdown-content prose prose-sm max-w-none dark:prose-invert prose-headings:my-2 prose-p:my-1 prose-hr:my-2 text-base font-medium">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={customMarkdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      
      <pre className="bg-black/80 dark:bg-white/10 text-white dark:text-green-300 p-2 rounded-lg overflow-x-auto text-xs mt-2">
        <code dangerouslySetInnerHTML={{ __html: sanitizedJson as string }}></code>
      </pre>
    </div>
  );
};
