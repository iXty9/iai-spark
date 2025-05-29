
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
    <div className="py-2 px-3 rounded-lg break-words text-base" style={{ color: 'inherit' }}>
      {isUser ? (
        <div className="text-base" style={{ color: 'inherit' }}>{content}</div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert text-base" style={{ color: 'inherit' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ...markdownComponents,
              // Override markdown components to inherit text color
              p: ({ children, ...props }) => <p {...props} style={{ color: 'inherit' }}>{children}</p>,
              span: ({ children, ...props }) => <span {...props} style={{ color: 'inherit' }}>{children}</span>,
              strong: ({ children, ...props }) => <strong {...props} style={{ color: 'inherit' }}>{children}</strong>,
              em: ({ children, ...props }) => <em {...props} style={{ color: 'inherit' }}>{children}</em>,
              code: ({ children, ...props }) => <code {...props} style={{ color: 'inherit' }}>{children}</code>,
              li: ({ children, ...props }) => <li {...props} style={{ color: 'inherit' }}>{children}</li>,
              h1: ({ children, ...props }) => <h1 {...props} style={{ color: 'inherit' }}>{children}</h1>,
              h2: ({ children, ...props }) => <h2 {...props} style={{ color: 'inherit' }}>{children}</h2>,
              h3: ({ children, ...props }) => <h3 {...props} style={{ color: 'inherit' }}>{children}</h3>,
              h4: ({ children, ...props }) => <h4 {...props} style={{ color: 'inherit' }}>{children}</h4>,
              h5: ({ children, ...props }) => <h5 {...props} style={{ color: 'inherit' }}>{children}</h5>,
              h6: ({ children, ...props }) => <h6 {...props} style={{ color: 'inherit' }}>{children}</h6>
            }}
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
