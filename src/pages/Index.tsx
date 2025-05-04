
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { fetchAppSettings } from '@/services/admin/settingsService';

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
  
  // Apply theme settings for anonymous users or users with profile settings
  useEffect(() => {
    const applyAppropriateTheme = async () => {
      try {
        if (user && profile?.theme_settings) {
          // If user is logged in and has profile settings, use those
          logger.info('User has profile theme settings, applying those', { module: 'index' });
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
        } else {
          // For anonymous users or logged in users without theme settings, 
          // fetch and apply default theme settings
          logger.info('Fetching default theme settings for anonymous or new user', { module: 'index' });
          try {
            const appSettings = await fetchAppSettings();
            
            if (appSettings && appSettings.default_theme_settings) {
              logger.info('Found default theme settings in app_settings', { module: 'index' });
              const defaultThemeSettings = JSON.parse(appSettings.default_theme_settings);
              
              // Apply background image if it exists
              if (defaultThemeSettings.backgroundImage) {
                logger.info('Applying default background image', { 
                  module: 'index',
                  bgImage: typeof defaultThemeSettings.backgroundImage
                });
                const opacity = parseFloat(defaultThemeSettings.backgroundOpacity || '0.5');
                applyBackgroundImage(defaultThemeSettings.backgroundImage, opacity);
              } else {
                applyBackgroundImage(null, 0.5);
              }
              
              // Apply theme colors based on current theme
              const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              const themeColors = currentTheme === 'light' 
                ? defaultThemeSettings.lightTheme 
                : defaultThemeSettings.darkTheme;
              
              if (themeColors) {
                logger.info('Applying default theme colors', { module: 'index' });
                applyThemeChanges(themeColors);
              }
            } else {
              logger.info('No default theme settings found, using hardcoded defaults', { module: 'index' });
              applyBackgroundImage(null, 0.5);
              // System defaults are in theme.css
            }
          } catch (e) {
            logger.error('Error fetching or applying default theme settings:', e, { module: 'index' });
            applyBackgroundImage(null, 0.5);
          }
        }
      } catch (e) {
        logger.error('Error in theme processing:', e, { module: 'index' });
        applyBackgroundImage(null, 0.5);
      }
    };
    
    applyAppropriateTheme();
  }, [user, profile]);
  
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
