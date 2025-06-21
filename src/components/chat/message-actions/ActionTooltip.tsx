
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionTooltipProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled = false,
  loading = false,
  active = false
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
              "h-6 w-6 p-0 text-muted-foreground hover:text-foreground",
              active && "text-primary hover:text-primary",
              disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
