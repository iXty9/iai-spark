
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
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
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
