
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
      className="flex items-center cursor-pointer" 
      onClick={handleLogoClick}
      style={{ 
        marginLeft: isMobile ? '0' : `calc(${dynamicPadding?.left || 0 / 4}rem - 1rem)` 
      }}
    >
      <img 
        src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
        alt="Ixty AI" 
        className="h-8 w-8 mr-3"
      />
      <div>
        <h1 className="text-lg font-bold">Ixty AI</h1>
      </div>
    </div>
  );
};
