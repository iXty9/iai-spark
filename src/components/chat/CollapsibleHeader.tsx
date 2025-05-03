
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHeader } from './ChatHeader';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { useDynamicPadding } from '@/hooks/use-dynamic-padding';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollapsibleHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: Message[]) => void;
  messages?: Message[];
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ 
  onClearChat, 
  onExportChat,
  onImportChat,
  messages = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMessages = messages && messages.length > 0;
  const dynamicPadding = useDynamicPadding();
  const isMobile = useIsMobile();

  return (
    <div className="relative mt-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-10 rounded-full hover:bg-accent",
          isExpanded ? "top-4" : "top-2"
        )}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div 
        className={cn(
          "transform transition-all duration-300 ease-in-out overflow-hidden bg-background/80 backdrop-blur-sm rounded-lg shadow-sm",
          isExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        )}
        style={{
          // Apply minimal or no padding on mobile
          paddingLeft: isExpanded ? (isMobile ? '0.5rem' : `${dynamicPadding.left}rem`) : 0,
          paddingRight: isExpanded ? (isMobile ? '0.5rem' : `${dynamicPadding.right}rem`) : 0
        }}
      >
        <ChatHeader 
          onClearChat={onClearChat} 
          onExportChat={onExportChat}
          onImportChat={onImportChat}
          hasMessages={hasMessages}
          dynamicPadding={dynamicPadding}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};
