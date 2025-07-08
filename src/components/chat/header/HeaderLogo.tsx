
import React, { useState, useEffect } from 'react';
import { useAIAgentName } from '@/hooks/use-ai-agent-name';
import { settingsCacheService } from '@/services/settings-cache-service';

interface HeaderLogoProps {
  isMobile?: boolean;
  dynamicPadding?: {
    left: number;
  };
}

export const HeaderLogo = ({ isMobile, dynamicPadding }: HeaderLogoProps) => {
  const { aiAgentName } = useAIAgentName();
  const [hideHeaderTitle, setHideHeaderTitle] = useState(false);
  const [headerLinkUrl, setHeaderLinkUrl] = useState('https://ixty9.com');
  const [avatarUrl, setAvatarUrl] = useState('https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsCacheService.getSettings();
        setHideHeaderTitle(settings.hide_menu_title === 'true');
        setHeaderLinkUrl(settings.header_link_url || 'https://ixty9.com');
        setAvatarUrl(settings.default_avatar_url || 'https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png');
      } catch (error) {
        console.error('Failed to load header settings:', error);
      }
    };

    loadSettings();

    // Subscribe to settings changes for real-time updates
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      setHideHeaderTitle(settings.hide_menu_title === 'true');
      setHeaderLinkUrl(settings.header_link_url || 'https://ixty9.com');
      setAvatarUrl(settings.default_avatar_url || 'https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png');
    });

    return unsubscribe;
  }, []);
  
  const handleLogoClick = () => {
    if (headerLinkUrl) {
      window.open(headerLinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Don't render if hiding is enabled
  if (hideHeaderTitle) {
    return null;
  }
  
  return (
    <div 
      className="flex items-center cursor-pointer flex-shrink-0" 
      onClick={handleLogoClick}
    >
      <img 
        src={avatarUrl} 
        alt="AI Assistant" 
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
          {aiAgentName || 'AI Assistant'}
        </h1>
      </div>
    </div>
  );
};
