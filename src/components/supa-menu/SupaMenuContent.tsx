import React, { forwardRef, useEffect, useState } from 'react';
import { MenuItem, MenuConfig } from '@/services/supa-menu/types';
import { SupaMenuItem } from './SupaMenuItem';
import { calculateMenuPosition } from './utils/positioning';

interface SupaMenuContentProps {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  config: MenuConfig;
}

export const SupaMenuContent = forwardRef<HTMLDivElement, SupaMenuContentProps>(
  ({ items, onItemClick, triggerRef, config }, ref) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (triggerRef.current) {
        const pos = calculateMenuPosition(triggerRef.current, config.position);
        setPosition(pos);
        setIsVisible(true);
      }
    }, [triggerRef, config.position]);

    // Update position on window resize
    useEffect(() => {
      const handleResize = () => {
        if (triggerRef.current) {
          const pos = calculateMenuPosition(triggerRef.current, config.position);
          setPosition(pos);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [triggerRef, config.position]);

    const menuStyle: React.CSSProperties = {
      position: 'fixed',
      top: position.top,
      left: position.left,
      transform: config.position.centered ? 'translateX(-50%)' : undefined,
      minWidth: '160px',
      maxWidth: '200px',
      zIndex: 1000,
      opacity: isVisible ? 1 : 0,
      backgroundColor: 'hsl(var(--background))',
      backdropFilter: `blur(${config.theme.backdropBlur}px)`,
      WebkitBackdropFilter: `blur(${config.theme.backdropBlur}px)`,
      border: '1px solid hsl(var(--border))',
      borderRadius: `${config.theme.borderRadius}px`,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      padding: '4px',
      transition: `opacity ${config.animation.duration}ms ${config.animation.easing}`,
    };

    return (
      <div
        ref={ref}
        style={menuStyle}
        className="supa-menu-content"
        role="menu"
        aria-orientation="vertical"
      >
        {items.map((item, index) => (
          <div key={item.id}>
            <SupaMenuItem
              item={item}
              onClick={() => onItemClick(item)}
              config={config}
            />
            {item.separator && index < items.length - 1 && (
              <div 
                className="h-px my-1 mx-1 bg-border/60"
              />
            )}
          </div>
        ))}
      </div>
    );
  }
);