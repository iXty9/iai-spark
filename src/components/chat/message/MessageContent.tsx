
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { createMarkdownComponents } from '@/utils/markdown-config';
import { useTheme } from '@/hooks/use-theme';

interface MessageContentProps {
  message: Message;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ message, isUser }) => {
  const { currentTheme } = useTheme();
  
  // Get themed markdown components
  const markdownComponents = createMarkdownComponents(currentTheme);

  if (isUser) {
    return (
      <div className="text-sm whitespace-pre-wrap break-words">
        {message.content}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
};
