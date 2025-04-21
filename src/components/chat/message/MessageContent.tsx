
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

  if (isUser || !isDevMode) {
    if (isUser) {
      // Normal text for user message
      return <div>{message.content}</div>;
    }
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

  // Show all available message data in dev mode
  const messageData = {
    ...message,
    rawResponse: message.rawResponse || null,
    tokenInfo: message.tokenInfo || null,
    threadId: message.threadId || null,
    metadata: message.metadata || null,
  };

  // Use DOMPurify but create a new trusted policy for TrustedHTML
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
      window.trustedTypes.createPolicy('default', {
        createHTML: (string) => DOMPurify.sanitize(string, { RETURN_TRUSTED_TYPE: true })
      });
    }
  }

  const sanitizedJson = DOMPurify.sanitize(
    JSON.stringify(messageData, null, 2),
    { RETURN_TRUSTED_TYPE: true }
  );

  return (
    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
      <code className="text-xs" dangerouslySetInnerHTML={{ __html: sanitizedJson }}></code>
    </pre>
  );
};
