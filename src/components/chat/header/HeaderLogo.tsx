
import React from 'react';
import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  isMobile?: boolean;
  dynamicPadding?: {
    left: number;
  };
}

export const HeaderLogo = ({ isMobile }: HeaderLogoProps) => {
  const handleLogoClick = () => {
    window.open('https://ixty9.com', '_blank', 'noopener,noreferrer');
  };
  
  return (
    <div 
      className="flex items-center cursor-pointer flex-shrink-0" 
      onClick={handleLogoClick}
    >
      <img 
        src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
        alt="Ixty AI" 
        className="h-7 w-7 mr-2 flex-shrink-0"
      />
      <div className="flex-shrink-0">
        <h1 className={cn(
          "font-bold whitespace-nowrap",
          isMobile ? "text-sm" : "text-base"
        )}>
          Ixty AI
        </h1>
      </div>
    </div>
  );
};
