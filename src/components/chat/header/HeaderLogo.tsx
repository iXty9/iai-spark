
import React from 'react';

interface HeaderLogoProps {
  isMobile?: boolean;
  dynamicPadding?: {
    left: number;
  };
}

export const HeaderLogo = ({ isMobile, dynamicPadding }: HeaderLogoProps) => {
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
        className="h-6 w-6 mr-2 flex-shrink-0 drop-shadow-sm"
        style={{
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3)) drop-shadow(0 0 4px rgba(255,255,255,0.2))'
        }}
      />
      <div className="flex-shrink-0">
        <h1 
          className="text-base font-bold whitespace-nowrap"
          style={{
            color: 'hsl(var(--foreground))',
            textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 0 4px rgba(255,255,255,0.3)',
            filter: 'contrast(1.2)'
          }}
        >
          Ixty AI
        </h1>
      </div>
    </div>
  );
};
