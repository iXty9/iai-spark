import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageActions } from './MessageActions';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Copy } from 'lucide-react';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageProps {
  message: MessageType;
}

interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const [aiIconError, setAiIconError] = React.useState(false);
  const { isDevMode } = useDevMode();

  const handleCopyJson = async () => {
    const jsonString = JSON.stringify(message, null, 2);
    await navigator.clipboard.writeText(jsonString);
    toast.success('JSON copied to clipboard');
  };
  
  return (
    <div 
      className={cn(
        "message py-6",
        isUser ? "user-message" : "ai-message",
        message.pending && "opacity-70"
      )}
      aria-label={`${isUser ? 'Your' : 'Ixty AI'} message`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6">
          {isUser ? (
            <Avatar className="w-6 h-6">
              <AvatarImage
                src="https://ixty9.com/wp-content/uploads/2025/04/profile-circle-icon-256x256-1.png"
                alt="User Avatar"
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="w-6 h-6">
              <AvatarImage 
                src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png"
                alt="Ixty AI Avatar"
                onError={() => setAiIconError(true)}
              />
              <AvatarFallback className="bg-[#ea384c] text-white flex items-center justify-center rounded-full text-xs">
                AI
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">
            {isUser ? 'You' : 'Ixty AI'}
          </p>
          <div className="markdown-content whitespace-pre-wrap text-sm">
            {isUser || !isDevMode ? (
              isUser ? message.content : (
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
                    h1: ({ node, ...props }: MarkdownComponentProps) => <h1 {...props} className="text-xl font-bold my-2" />,
                    h2: ({ node, ...props }: MarkdownComponentProps) => <h2 {...props} className="text-lg font-bold my-1.5" />,
                    h3: ({ node, ...props }: MarkdownComponentProps) => <h3 {...props} className="text-md font-bold my-1" />,
                    p: ({ node, ...props }: MarkdownComponentProps) => <p {...props} className="my-1" />,
                    ul: ({ node, ...props }: MarkdownComponentProps) => <ul {...props} className="list-disc pl-5 my-1.5 space-y-0.5" />,
                    ol: ({ node, ...props }: MarkdownComponentProps) => <ol {...props} className="list-decimal pl-5 my-1.5 space-y-0.5" />,
                    li: ({ node, ...props }: MarkdownComponentProps) => <li {...props} className="my-0.5" />,
                    hr: ({ node, ...props }: MarkdownComponentProps) => <hr {...props} className="my-2 border-muted" />,
                    blockquote: ({ node, ...props }: MarkdownComponentProps) => (
                      <blockquote 
                        {...props} 
                        className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground" 
                      />
                    ),
                    table: ({ node, ...props }: MarkdownComponentProps) => (
                      <div className="overflow-x-auto my-2 rounded-md border border-border">
                        <table {...props} className="min-w-full divide-y divide-border" />
                      </div>
                    ),
                    thead: ({ node, ...props }: MarkdownComponentProps) => <thead {...props} className="bg-muted" />,
                    tbody: ({ node, ...props }: MarkdownComponentProps) => <tbody {...props} className="divide-y divide-border" />,
                    tr: ({ node, ...props }: MarkdownComponentProps) => <tr {...props} className="hover:bg-muted/50 transition-colors" />,
                    th: ({ node, ...props }: MarkdownComponentProps) => <th {...props} className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider" />,
                    td: ({ node, ...props }: MarkdownComponentProps) => <td {...props} className="px-3 py-1.5 whitespace-nowrap" />,
                    img: ({ node, ...props }: MarkdownComponentProps) => {
                      const [imgError, setImgError] = React.useState(false);
                      
                      const handleError = () => {
                        console.log("Image failed to load:", props.src);
                        setImgError(true);
                      };
                      
                      return imgError ? (
                        <div className="max-w-full p-4 text-center border border-muted rounded-md my-2 bg-muted/30">
                          <p className="text-sm text-muted-foreground">Image could not be loaded</p>
                          <p className="text-xs text-muted-foreground mt-1 break-all">{props.src?.toString().substring(0, 50)}...</p>
                        </div>
                      ) : (
                        <img 
                          {...props} 
                          className="max-w-full h-auto rounded-md my-2" 
                          alt={props.alt || "Image"} 
                          loading="lazy"
                          onError={handleError}
                          crossOrigin="anonymous" 
                          referrerPolicy="no-referrer"
                          width={props.width || "auto"}
                          height={props.height || "auto"}
                        />
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )
            ) : (
              <div className="relative">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyJson}
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="w-full bg-muted p-4 rounded-md overflow-x-auto">
                    <code className="text-xs">
                      {JSON.stringify(message, null, 2)}
                    </code>
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs opacity-60">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {!isUser && <MessageActions messageId={message.id} content={message.content} />}
          </div>
        </div>
      </div>
    </div>
  );
};
