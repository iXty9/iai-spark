
import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
  message: MessageType;
}

// Adding proper type definitions for ReactMarkdown components
interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

interface CodeComponentProps extends MarkdownComponentProps {
  inline?: boolean;
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
                  a: ({ node, ...props }: MarkdownComponentProps) => (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    />
                  ),
                  h1: ({ node, ...props }: MarkdownComponentProps) => <h1 {...props} className="text-xl font-bold my-3" />,
                  h2: ({ node, ...props }: MarkdownComponentProps) => <h2 {...props} className="text-lg font-bold my-2" />,
                  h3: ({ node, ...props }: MarkdownComponentProps) => <h3 {...props} className="text-md font-bold my-1" />,
                  p: ({ node, ...props }: MarkdownComponentProps) => <p {...props} className="mb-3" />,
                  ul: ({ node, ...props }: MarkdownComponentProps) => <ul {...props} className="list-disc pl-5 mb-3 space-y-1" />,
                  ol: ({ node, ...props }: MarkdownComponentProps) => <ol {...props} className="list-decimal pl-5 mb-3 space-y-1" />,
                  li: ({ node, ...props }: MarkdownComponentProps) => <li {...props} className="mb-1" />,
                  hr: ({ node, ...props }: MarkdownComponentProps) => <hr {...props} className="my-4 border-muted" />,
                  em: ({ node, ...props }: MarkdownComponentProps) => <em {...props} className="italic" />,
                  strong: ({ node, ...props }: MarkdownComponentProps) => <strong {...props} className="font-bold" />,
                  del: ({ node, ...props }: MarkdownComponentProps) => <del {...props} className="line-through" />,
                  code: ({ node, inline, ...props }: CodeComponentProps) => (
                    <code 
                      {...props} 
                      className={cn(
                        "font-mono text-sm",
                        inline ? "bg-muted px-1 py-0.5 rounded" : "block bg-muted p-3 rounded-md overflow-x-auto"
                      )}
                    />
                  ),
                  pre: ({ node, ...props }: MarkdownComponentProps) => (
                    <pre 
                      {...props} 
                      className="my-3 rounded-md overflow-hidden"
                    />
                  ),
                  blockquote: ({ node, ...props }: MarkdownComponentProps) => (
                    <blockquote 
                      {...props} 
                      className="border-l-4 border-primary/30 pl-4 italic my-3 text-muted-foreground" 
                    />
                  ),
                  table: ({ node, ...props }: MarkdownComponentProps) => (
                    <div className="overflow-x-auto my-3 rounded-md border border-border">
                      <table {...props} className="min-w-full divide-y divide-border" />
                    </div>
                  ),
                  thead: ({ node, ...props }: MarkdownComponentProps) => <thead {...props} className="bg-muted" />,
                  tbody: ({ node, ...props }: MarkdownComponentProps) => <tbody {...props} className="divide-y divide-border" />,
                  tr: ({ node, ...props }: MarkdownComponentProps) => <tr {...props} className="hover:bg-muted/50 transition-colors" />,
                  th: ({ node, ...props }: MarkdownComponentProps) => <th {...props} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" />,
                  td: ({ node, ...props }: MarkdownComponentProps) => <td {...props} className="px-3 py-2 whitespace-nowrap" />,
                  img: ({ node, ...props }: MarkdownComponentProps) => (
                    <img 
                      {...props} 
                      className="max-w-full h-auto rounded-md my-3" 
                      alt={props.alt || "Image"} 
                    />
                  ),
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
