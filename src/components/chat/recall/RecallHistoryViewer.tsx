
import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { X, History, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecallHistoryViewerProps {
  messages: Message[];
  selectedIndex: number;
  selectedDatetime: string;
  onSelectMessage: (message: Message) => void;
  onCancel: () => void;
}

export const RecallHistoryViewer: React.FC<RecallHistoryViewerProps> = ({
  messages,
  selectedIndex,
  selectedDatetime,
  onSelectMessage,
  onCancel,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to selected message on mount
  useEffect(() => {
    if (selectedMessageRef.current) {
      selectedMessageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Chat Recall</h2>
            <p className="text-xs text-muted-foreground">
              Viewing history from {format(new Date(selectedDatetime), 'MMM d, yyyy • h:mm a')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Instruction Banner */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MousePointer className="h-3 w-3" />
          <span>Click on any message to use it as context for your next conversation</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.map((msg, index) => {
            const isSelected = index === selectedIndex;
            const isUser = msg.sender === 'user';
            
            return (
              <div
                key={msg.id}
                ref={isSelected ? selectedMessageRef : null}
                onClick={() => onSelectMessage(msg)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all duration-200",
                  "border hover:border-primary/50 hover:shadow-md",
                  isUser ? "ml-8 bg-primary/10" : "mr-8 bg-muted/50",
                  isSelected && "ring-2 ring-primary border-primary shadow-lg",
                  !isSelected && "border-border/30"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-medium",
                        isUser ? "text-primary" : "text-muted-foreground"
                      )}>
                        {isUser ? 'You' : 'AI'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.timestamp), 'MMM d • h:mm a')}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Selected time
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-3 break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-background/80">
        <p className="text-xs text-center text-muted-foreground">
          {messages.length} messages loaded • Read-only view
        </p>
      </div>
    </div>
  );
};
