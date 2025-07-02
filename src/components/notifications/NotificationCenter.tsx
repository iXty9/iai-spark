import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative rounded-full h-9 w-9 md:h-8 md:w-8 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm",
            className
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 md:h-4 md:w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-destructive text-destructive-foreground rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center"
        side="bottom"
        className="w-[calc(100vw-2rem)] max-w-sm md:w-96 p-0"
        sideOffset={8}
      >
        <NotificationList onClose={() => setIsOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};