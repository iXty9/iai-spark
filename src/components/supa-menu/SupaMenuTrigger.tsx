import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';

interface SupaMenuTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  isOpen?: boolean;
}

export const SupaMenuTrigger = forwardRef<HTMLButtonElement, SupaMenuTriggerProps>(
  ({ children, onClick, disabled = false, className, isOpen = false }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        className={`
          relative rounded-full h-9 w-9 md:h-8 md:w-8 
          border border-border/40 hover:border-[#dd3333]/30 
          transition-all duration-200 flex-shrink-0 shadow-sm
          ${isOpen ? 'bg-accent' : ''}
          ${className || ''}
        `}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {children}
      </Button>
    );
  }
);