
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
  variant?: 'default' | 'success' | 'destructive' | 'none';
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled = false,
  loading = false,
  active = false,
  variant = 'default'
}) => {
  const getActiveStyles = () => {
    if (!active) return '';
    
    switch (variant) {
      case 'success':
        return 'text-green-600 hover:text-green-600 bg-green-50 scale-105';
      case 'destructive':
        return 'text-red-600 hover:text-red-600 bg-red-50 scale-105';
      case 'none':
        return '';
      case 'default':
      default:
        return 'text-primary hover:text-primary bg-primary/10 scale-105';
    }
  };

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
              "h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-all duration-200",
              getActiveStyles(),
              disabled && "opacity-40 cursor-not-allowed",
              "hover:scale-110"
            )}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon className="h-3 w-3 transition-transform duration-200" />
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
