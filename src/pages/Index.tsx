
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  // Apply background image and theme settings from profile
  useEffect(() => {
    if (user && profile) {
      try {
        // If user is logged in and has profile settings, use those
        if (profile.theme_settings) {
          try {
            const themeSettings = JSON.parse(profile.theme_settings);
            
            // Apply background image if it exists
            if (themeSettings.backgroundImage) {
              logger.info('Applying background image from profile', { module: 'index' });
              document.body.style.backgroundImage = `url(${themeSettings.backgroundImage})`;
              document.documentElement.style.setProperty('--bg-opacity', themeSettings.backgroundOpacity || "0.5");
              document.body.classList.add('with-bg-image');
            } else {
              document.body.style.backgroundImage = 'none';
              document.body.classList.remove('with-bg-image');
            }
            
            // Apply theme colors based on current theme
            const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const themeColors = currentTheme === 'light' ? themeSettings.lightTheme : themeSettings.darkTheme;
            
            if (themeColors) {
              const root = document.documentElement;
              root.style.setProperty('--background-color', themeColors.backgroundColor);
              root.style.setProperty('--primary-color', themeColors.primaryColor);
              root.style.setProperty('--text-color', themeColors.textColor);
              root.style.setProperty('--accent-color', themeColors.accentColor);
              root.style.setProperty('--user-bubble-color', themeColors.userBubbleColor || themeColors.primaryColor);
              root.style.setProperty('--ai-bubble-color', themeColors.aiBubbleColor || themeColors.accentColor);
              root.style.setProperty('--user-bubble-opacity', (themeColors.userBubbleOpacity || 0.3).toString());
              root.style.setProperty('--ai-bubble-opacity', (themeColors.aiBubbleOpacity || 0.3).toString());
              root.style.setProperty('--user-text-color', themeColors.userTextColor || themeColors.textColor);
              root.style.setProperty('--ai-text-color', themeColors.aiTextColor || themeColors.textColor);
            }
          } catch (e) {
            logger.error('Error parsing theme settings from profile:', e, { module: 'index' });
          }
        } else {
          // No theme settings in profile
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('with-bg-image');
        }
      } catch (error) {
        logger.error('Error applying saved theme settings:', error, { module: 'index' });
      }
    } else {
      // User not logged in, remove background
      document.body.style.backgroundImage = 'none';
      document.body.classList.remove('with-bg-image');
    }
  }, [location.pathname, user, profile]);
  
  return (
    <div className={`h-screen w-full bg-transparent ${isIOSSafari ? 'ios-safari-page' : ''}`}>
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      <IOSFallbackInput show={isIOSSafari && showFallbackInput} />
    </div>
  );
};

export default Index;
