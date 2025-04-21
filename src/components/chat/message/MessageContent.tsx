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

  // Use enhanced styling for both user and AI bubbles
  if (isUser || !isDevMode) {
    if (isUser) {
      // User message: slightly larger text and responsive break.
      return (
        <div className="whitespace-pre-line text-base font-medium">
          {message.content}
        </div>
      );
    }
    // AI message: markdown rendering as before, but with good spacing.
    return (
      <div className="markdown-content prose prose-sm max-w-none dark:prose-invert prose-headings:my-2 prose-p:my-1 prose-hr:my-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }

  // Dev mode: show all message data in a well-styled code block
  const messageData = {
    ...message,
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
    <pre className="bg-black/80 dark:bg-white/10 text-white dark:text-green-300 p-2 rounded-lg overflow-x-auto text-xs mt-2">
      <code dangerouslySetInnerHTML={{ __html: sanitizedJson as string }}></code>
    </pre>
  );
};
