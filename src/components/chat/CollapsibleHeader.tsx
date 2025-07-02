
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
      {/* Main sliding menu container */}
      <div 
        className={cn(
          "transform transition-all duration-300 ease-out overflow-hidden rounded-b-xl shadow-lg border border-border/20",
          "max-w-[1000px] mx-auto", // Max width constraint with centering
          "bg-background/85 backdrop-blur-xl", // Enhanced glass effect
          isExpanded 
            ? "max-h-20 opacity-100 mt-0 pt-4 pb-4" // Much reduced height since no internal button
            : "max-h-0 opacity-0 -mt-4 pt-0 pb-0"
        )}
        style={{
          backdropFilter: isExpanded ? 'blur(20px)' : 'blur(12px)',
          boxShadow: isExpanded 
            ? '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
            : '0 4px 16px rgba(0, 0, 0, 0.08)',
          background: isExpanded 
            ? 'linear-gradient(135deg, hsl(var(--background))/90, hsl(var(--background))/95)'
            : 'hsl(var(--background))/80'
        }}
      >
        {isExpanded && (
          <div className="px-6 md:px-8">
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

      {/* X button positioned below the menu when expanded */}
      {isExpanded && (
        <div className="flex justify-center mt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(false)}
            className="h-10 w-10 rounded-full transition-all duration-300 hover:bg-destructive/10 hover:text-destructive shadow-sm bg-background/80 backdrop-blur-sm border border-border/30 z-20"
          >
            <X className="h-5 w-5 transition-transform duration-300" />
          </Button>
        </div>
      )}

      {/* Toggle button - only visible when menu is closed */}
      {!isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(true)}
          className="absolute left-1/2 -translate-x-1/2 top-3 z-30 rounded-full transition-all duration-300 hover:bg-primary/10 hover:text-primary shadow-md h-12 w-12 md:h-10 md:w-10 bg-background/80 backdrop-blur-sm border border-border/20"
        >
          <Menu className="h-6 w-6 md:h-5 md:w-5 transition-transform duration-300" />
        </Button>
      )}
    </div>
  );
};
