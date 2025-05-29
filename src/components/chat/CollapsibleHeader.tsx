
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHeader } from './ChatHeader';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { useDynamicPadding } from '@/hooks/use-dynamic-padding';
import { useIsMobile } from '@/hooks/use-mobile';
import { HeaderLogo } from './header/HeaderLogo';
import { UserMenu } from '@/components/UserMenu';
import { HeaderActions } from './header/HeaderActions';

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

  const handleImportClick = () => {
    // This will be handled by HeaderActions
  };

  return (
    <div className="relative">
      {/* Main Header Bar */}
      <div className="flex items-center justify-between h-12 px-3 bg-background/95 backdrop-blur-md rounded-lg shadow-sm border border-border/20 relative z-20">
        {/* Left Side: Hamburger + Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-300 hover:bg-[#dd3333]/10 hover:text-[#dd3333] flex-shrink-0",
              isExpanded && "bg-[#dd3333]/10 text-[#dd3333]"
            )}
          >
            <Menu className={cn(
              "h-4 w-4 transition-transform duration-300",
              isExpanded && "rotate-90"
            )} />
          </Button>
          
          <HeaderLogo isMobile={isMobile} />
        </div>

        {/* Right Side: User Menu + Actions (collapsed view) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <UserMenu />
          
          {!isExpanded && (
            <HeaderActions 
              onClearChat={onClearChat}
              onExportChat={onExportChat}
              onImportChat={onImportChat}
              onReloadTheme={onReloadTheme}
              onImportClick={handleImportClick}
              hasMessages={hasMessages}
              dynamicPadding={{ right: 0 }}
              isMobile={isMobile}
              isCompact={true}
            />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <div 
        className={cn(
          "transform transition-all duration-300 ease-out overflow-hidden bg-background/95 backdrop-blur-md rounded-lg shadow-lg border border-border/20 mt-2",
          isExpanded 
            ? "max-h-20 opacity-100" 
            : "max-h-0 opacity-0"
        )}
      >
        {isExpanded && (
          <div className="p-3">
            <HeaderActions 
              onClearChat={onClearChat}
              onExportChat={onExportChat}
              onImportChat={onImportChat}
              onReloadTheme={onReloadTheme}
              onImportClick={handleImportClick}
              hasMessages={hasMessages}
              dynamicPadding={dynamicPadding}
              isMobile={isMobile}
              isCompact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
