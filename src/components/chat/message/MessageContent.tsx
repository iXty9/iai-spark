
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/utils/markdown-config';
import { useDevMode } from '@/store/use-dev-mode';
import { Message as MessageType } from '@/types/chat';

interface MessageContentProps {
  message: MessageType;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ message, isUser }) => {
  const { isDevMode } = useDevMode();

  if (isUser || !isDevMode) {
    if (isUser) {
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

  return (
    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
      <code className="text-xs">
        {JSON.stringify(message, null, 2)}
      </code>
    </pre>
  );
};
