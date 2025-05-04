
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/utils/markdown-config';
import { cn } from '@/lib/utils';

type MessageContentProps = {
  content: string;
  isUser: boolean;
};

export default function MessageContent({ content, isUser }: MessageContentProps) {
  return (
    <div
      className={cn(
        'py-2 px-3 rounded-lg break-words text-base',
        isUser
          ? 'bg-primary/30 text-user-message'
          : 'bg-accent/30 text-ai-message'
      )}
    >
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
