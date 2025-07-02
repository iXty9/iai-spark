import React, { useState, useRef, useEffect } from 'react';
import { MenuItem } from '@/services/supa-menu/types';
import { SupaMenuContent } from './SupaMenuContent';
import { SupaMenuTrigger } from './SupaMenuTrigger';
import { useSupaMenu } from '@/hooks/use-supa-menu';

interface SupaMenuProps {
  items: MenuItem[];
  trigger: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export const SupaMenu: React.FC<SupaMenuProps> = ({
  items,
  trigger,
  className,
  triggerClassName,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { state } = useSupaMenu();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        contentRef.current &&
        triggerRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  const visibleItems = items.filter(item => !item.hidden);

  return (
    <div className={`relative ${className || ''}`}>
      <SupaMenuTrigger
        ref={triggerRef}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={triggerClassName}
        isOpen={isOpen}
      >
        {trigger}
      </SupaMenuTrigger>

      {isOpen && state.isReady && (
        <SupaMenuContent
          ref={contentRef}
          items={visibleItems}
          onItemClick={handleItemClick}
          triggerRef={triggerRef}
          config={state.config}
        />
      )}
    </div>
  );
};