
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
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Menu button - fixed at the top center */}
      <div className="relative flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "rounded-full hover:bg-accent",
            isExpanded ? "mt-4" : "mt-2"
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Expandable header */}
      <div 
        className={cn(
          "transform transition-all duration-300 ease-in-out overflow-hidden bg-background",
          isExpanded ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <ChatHeader onClearChat={onClearChat} onExportChat={onExportChat} />
      </div>
    </div>
  );
};
