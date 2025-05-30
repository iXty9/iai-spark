
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHeader } from './ChatHeader';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
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
  const isMobile = useIsMobile();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-30 rounded-full transition-all duration-300 hover:bg-[#dd3333]/10 hover:text-[#dd3333] shadow-md",
          "h-12 w-12 md:h-10 md:w-10", // Larger touch target on mobile
          isExpanded 
            ? "top-3 bg-background/95 backdrop-blur-sm border border-border/30" 
            : "top-3 bg-background/80 backdrop-blur-sm border border-border/20"
        )}
      >
        {isExpanded ? (
          <X className="h-6 w-6 md:h-5 md:w-5 transition-transform duration-300" />
        ) : (
          <Menu className="h-6 w-6 md:h-5 md:w-5 transition-transform duration-300" />
        )}
      </Button>

      <div 
        className={cn(
          "transform transition-all duration-300 ease-out overflow-hidden bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border/30",
          "mx-4 md:mx-8", // Consistent horizontal margins
          isExpanded 
            ? "max-h-40 opacity-100 mt-0 pt-16 pb-4" // Increased max height
            : "max-h-0 opacity-0 -mt-4 pt-0 pb-0"
        )}
        style={{
          backdropFilter: isExpanded ? 'blur(16px)' : 'blur(8px)',
          boxShadow: isExpanded ? '0 8px 32px rgba(0, 0, 0, 0.12)' : '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}
      >
        {isExpanded && (
          <div className="px-4 md:px-6">
            <ChatHeader 
              onClearChat={onClearChat} 
              onExportChat={onExportChat}
              onImportChat={onImportChat}
              onReloadTheme={onReloadTheme}
              hasMessages={hasMessages}
              dynamicPadding={{ left: 0, right: 0 }}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    </div>
  );
};
