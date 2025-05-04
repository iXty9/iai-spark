
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/utils/markdown-config';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';

type MessageContentProps = {
  message: MessageType;
  isUser: boolean;
};

export function MessageContent({ message, isUser }: MessageContentProps) {
  const content = message.content;
  
  return (
    <div className="py-2 px-3 rounded-lg break-words text-base">
      {isUser ? (
        <div className="text-base">{content}</div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// Default export to ensure compatibility with any import style
export default MessageContent;
