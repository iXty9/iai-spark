
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
    <div className="relative">
      {/* Hamburger button - always visible at the top center */}
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

      {/* Expandable header */}
      <div 
        className={cn(
          "transform transition-all duration-300 ease-in-out overflow-hidden",
          isExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ChatHeader onClearChat={onClearChat} onExportChat={onExportChat} />
      </div>
    </div>
  );
};
