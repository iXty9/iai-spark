import React from 'react';
import { MenuItem, MenuConfig } from '@/services/supa-menu/types';

interface SupaMenuItemProps {
  item: MenuItem;
  onClick: () => void;
  config: MenuConfig;
}

export const SupaMenuItem: React.FC<SupaMenuItemProps> = ({ item, onClick, config }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '10px 8px',
    borderRadius: '6px',
    border: 'none',
    background: isHovered 
      ? `color-mix(in srgb, ${config.theme.hoverBackgroundColor} ${config.theme.hoverBackgroundOpacity * 100}%, transparent)`
      : 'transparent',
    color: isHovered ? config.theme.hoverTextColor : config.theme.textColor,
    cursor: 'pointer',
    fontSize: '14px',
    transition: `all ${config.animation.duration}ms ${config.animation.easing}`,
    textAlign: 'left',
    outline: 'none',
  };

  const isMobile = window.innerWidth < config.responsive.mobileBreakpoint;
  const showIcon = item.icon && (!isMobile || config.responsive.showIconsOnMobile);
  const label = isMobile && config.responsive.compactOnMobile && item.shortLabel 
    ? item.shortLabel 
    : item.label;

  return (
    <button
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="menuitem"
      className="supa-menu-item"
    >
      {showIcon && item.icon && (
        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
};