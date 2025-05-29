
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
    <div className="py-2 px-3 rounded-lg break-words text-base leading-relaxed" style={{ color: 'inherit' }}>
      {isUser ? (
        <div className="text-base whitespace-pre-wrap" style={{ color: 'inherit' }}>{content}</div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert text-base prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-li:text-inherit prose-a:text-inherit" style={{ color: 'inherit' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ...markdownComponents,
              // Override all text elements to inherit color properly
              p: ({ children, ...props }) => (
                <p {...props} className="mb-4 last:mb-0 leading-relaxed" style={{ color: 'inherit' }}>
                  {children}
                </p>
              ),
              span: ({ children, ...props }) => <span {...props} style={{ color: 'inherit' }}>{children}</span>,
              strong: ({ children, ...props }) => <strong {...props} className="font-bold" style={{ color: 'inherit' }}>{children}</strong>,
              em: ({ children, ...props }) => <em {...props} className="italic" style={{ color: 'inherit' }}>{children}</em>,
              code: ({ children, ...props }) => {
                // Check if this is inline code by checking if it's wrapped in a pre element
                const isInline = !props.className?.includes('language-');
                return isInline ? (
                  <code {...props} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border" style={{ color: 'inherit' }}>
                    {children}
                  </code>
                ) : (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 border">
                    <code className="text-sm font-mono" style={{ color: 'inherit' }}>{children}</code>
                  </pre>
                );
              },
              li: ({ children, ...props }) => <li {...props} className="ml-2 leading-relaxed" style={{ color: 'inherit' }}>{children}</li>,
              h1: ({ children, ...props }) => <h1 {...props} className="text-2xl font-bold mb-4 mt-6 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h1>,
              h2: ({ children, ...props }) => <h2 {...props} className="text-xl font-bold mb-3 mt-5 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h2>,
              h3: ({ children, ...props }) => <h3 {...props} className="text-lg font-bold mb-2 mt-4 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h3>,
              h4: ({ children, ...props }) => <h4 {...props} className="text-base font-bold mb-2 mt-3 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h4>,
              h5: ({ children, ...props }) => <h5 {...props} className="text-sm font-bold mb-2 mt-2 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h5>,
              h6: ({ children, ...props }) => <h6 {...props} className="text-xs font-bold mb-2 mt-2 first:mt-0 leading-tight" style={{ color: 'inherit' }}>{children}</h6>
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
