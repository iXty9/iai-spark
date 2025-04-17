
import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div 
      className={cn(
        "message",
        isUser ? "user-message" : "ai-message",
        message.pending && "opacity-70"
      )}
      aria-label={`${isUser ? 'Your' : 'Ixty AI'} message`}
    >
      <div className="flex items-start gap-2">
        {!isUser && (
          <div className="flex-shrink-0 w-6 h-6">
            <img 
              src="https://ixty.ai/wp-content/uploads/2024/11/faviconV4.png" 
              alt="Ixty AI" 
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">
            {isUser ? 'You' : 'Ixty AI'}
          </p>
          <div className="markdown-content whitespace-pre-wrap text-sm">
            {isUser ? (
              message.content
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    />
                  ),
                  h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold my-2" />,
                  h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold my-2" />,
                  h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold my-1" />,
                  p: ({ node, ...props }) => <p {...props} className="mb-2" />,
                  ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-2" />,
                  ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-2" />,
                  code: ({ node, inline, ...props }) => (
                    <code 
                      {...props} 
                      className={cn(
                        "font-mono text-sm",
                        inline ? "bg-muted px-1 py-0.5 rounded" : "block bg-muted p-2 rounded overflow-x-auto"
                      )}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote 
                      {...props} 
                      className="border-l-4 border-muted pl-4 italic my-2" 
                    />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-2">
                      <table {...props} className="min-w-full divide-y divide-border" />
                    </div>
                  ),
                  thead: ({ node, ...props }) => <thead {...props} className="bg-muted" />,
                  tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
                  tr: ({ node, ...props }) => <tr {...props} className="hover:bg-muted/50 transition-colors" />,
                  th: ({ node, ...props }) => <th {...props} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" />,
                  td: ({ node, ...props }) => <td {...props} className="px-3 py-2 whitespace-nowrap" />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          <div className="text-xs opacity-60 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};
