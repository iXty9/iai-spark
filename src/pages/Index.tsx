
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  // Apply iOS viewport fixes
  useEffect(() => {
    if (isIOSSafari) {
      // Fix viewport height issues on iOS
      const setIOSViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setIOSViewportHeight();
      window.addEventListener('resize', setIOSViewportHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(setIOSViewportHeight, 100);
      });
      
      return () => {
        window.removeEventListener('resize', setIOSViewportHeight);
        window.removeEventListener('orientationchange', () => {});
      };
    }
  }, [isIOSSafari]);
  
  // Apply background image and theme settings from profile
  useEffect(() => {
    if (profile?.theme_settings) {
      try {
        // If user is logged in and has profile settings, use those
        const themeSettings = JSON.parse(profile.theme_settings);
        
        // Apply background image if it exists
        if (themeSettings.backgroundImage) {
          logger.info('Applying background image from profile', { module: 'index' });
          const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
          applyBackgroundImage(themeSettings.backgroundImage, opacity);
        } else {
          applyBackgroundImage(null, 0.5);
        }
        
        // Apply theme colors based on current theme
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const themeColors = currentTheme === 'light' ? themeSettings.lightTheme : themeSettings.darkTheme;
        
        if (themeColors) {
          applyThemeChanges(themeColors);
        }
      } catch (e) {
        logger.error('Error parsing theme settings from profile:', e, { module: 'index' });
      }
    } else {
      // No theme settings in profile
      applyBackgroundImage(null, 0.5);
    }
  }, [profile]);
  
  return (
    <div 
      className={`h-screen w-full bg-transparent ${isIOSSafari ? 'ios-safari-page' : ''}`}
      style={{ height: isIOSSafari ? 'calc(var(--vh, 1vh) * 100)' : '100vh' }}
    >
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      <IOSFallbackInput show={isIOSSafari && showFallbackInput} />
    </div>
  );
};

export default Index;
