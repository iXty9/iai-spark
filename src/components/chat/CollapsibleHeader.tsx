
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHeader } from './ChatHeader';
import { cn } from '@/lib/utils';

interface CollapsibleHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ onClearChat, onExportChat }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative z-10">
      {/* Hamburger button - always visible */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 top-2 transition-transform duration-300",
        isExpanded && "translate-y-16 opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(true)}
          className="rounded-full hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Expandable header */}
      <div 
        className={cn(
          "transform transition-transform duration-300 ease-in-out",
          isExpanded ? "translate-y-0" : "-translate-y-full"
        )}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <ChatHeader onClearChat={onClearChat} onExportChat={onExportChat} />
      </div>
    </div>
  );
};
