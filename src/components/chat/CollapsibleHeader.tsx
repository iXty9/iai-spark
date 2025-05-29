
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
  onReloadTheme: () => void;
  messages?: Message[];
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ 
  onClearChat, 
  onExportChat,
  onImportChat,
  onReloadTheme,
  messages = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMessages = messages && messages.length > 0;
  const dynamicPadding = useDynamicPadding();
  const isMobile = useIsMobile();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-30 rounded-full transition-all duration-300 hover:bg-[#dd3333]/10 hover:text-[#dd3333]",
          isExpanded 
            ? "top-2 bg-background/90 backdrop-blur-sm shadow-sm" 
            : "top-2 bg-background/70 backdrop-blur-sm"
        )}
      >
        <Menu className={cn(
          "h-5 w-5 transition-transform duration-300",
          isExpanded && "rotate-90"
        )} />
      </Button>

      <div 
        className={cn(
          "transform transition-all duration-300 ease-out overflow-hidden bg-background/95 backdrop-blur-md rounded-lg shadow-lg border border-border/20",
          isExpanded 
            ? "max-h-24 opacity-100 mt-0 pt-12 pb-3" 
            : "max-h-0 opacity-0 -mt-4 pt-0 pb-0"
        )}
        style={{
          paddingLeft: isExpanded ? (isMobile ? '0.75rem' : `${Math.max(1, dynamicPadding.left)}rem`) : 0,
          paddingRight: isExpanded ? (isMobile ? '0.75rem' : `${Math.max(1, dynamicPadding.right)}rem`) : 0
        }}
      >
        {isExpanded && (
          <ChatHeader 
            onClearChat={onClearChat} 
            onExportChat={onExportChat}
            onImportChat={onImportChat}
            onReloadTheme={onReloadTheme}
            hasMessages={hasMessages}
            dynamicPadding={dynamicPadding}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
};
