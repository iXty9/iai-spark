import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationList } from './NotificationList';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { unreadCount } = useNotificationCenter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "relative rounded-full min-h-9 min-w-9 max-h-9 max-w-9 md:min-h-10 md:min-w-10 md:max-h-10 md:max-w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm",
                  className
                )}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 md:h-5 md:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-destructive text-destructive-foreground rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent 
        align="center"
        side="bottom"
        className="w-[calc(100vw-2rem)] max-w-sm md:w-96 p-0"
        sideOffset={8}
        alignOffset={0}
        collisionPadding={6}
        avoidCollisions={true}
      >
        <NotificationList onClose={() => setIsOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};