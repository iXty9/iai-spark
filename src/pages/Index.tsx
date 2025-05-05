
import React, { useEffect, useState } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import { logger } from '@/utils/logging';
import { forceReloadSettings } from '@/services/admin/settingsService';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  const { isThemeLoaded, theme, reloadTheme } = useTheme();
  const [attemptedThemeLoad, setAttemptedThemeLoad] = useState(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);
  
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
  
  // Check if theme loaded properly, and if not, attempt to force load it once
  useEffect(() => {
    const loadThemeIfNeeded = async () => {
      setIsLoadingTheme(true);
      logger.info('Index component mounted - checking theme status', { 
        module: 'index',
        isThemeLoaded, 
        attemptedThemeLoad 
      });
      
      // Only attempt to force load theme once
      if (!isThemeLoaded && !attemptedThemeLoad) {
        logger.info('Attempting to force load theme on Index component mount', { module: 'index' });
        setAttemptedThemeLoad(true);
        
        try {
          // Wait for normal theme loading to complete first
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // If theme is still not loaded, force reload settings
          if (!isThemeLoaded) {
            logger.info('Force loading theme settings', { module: 'index' });
            const settings = await forceReloadSettings();
            
            // Check if settings returned default theme and log
            if (settings && settings.default_theme_settings) {
              logger.info('Successfully loaded default theme from settings', { 
                module: 'index',
                hasDefaultTheme: true
              });
              
              // Explicitly trigger theme reload to apply settings
              reloadTheme();
            } else {
              logger.warn('No default theme found in settings after force reload', { 
                module: 'index',
                settingsKeys: Object.keys(settings || {})
              });
            }
          }
        } catch (error) {
          logger.error('Error during automatic theme loading', error, { module: 'index' });
        } finally {
          // Set loading to false after waiting a bit to ensure theme is applied
          setTimeout(() => setIsLoadingTheme(false), 500);
        }
      } else {
        // Theme is already loaded, so set loading to false
        setIsLoadingTheme(false);
      }
    };
    
    loadThemeIfNeeded();
  }, [isThemeLoaded, attemptedThemeLoad, reloadTheme]);
  
  // Log when theme is loaded to help with debugging
  useEffect(() => {
    if (isThemeLoaded) {
      logger.info('Theme loaded in Index component', { 
        module: 'index',
        theme,
        attemptedForceLoad: attemptedThemeLoad
      });
      
      // If theme is loaded, we're not loading anymore
      setIsLoadingTheme(false);
    }
  }, [isThemeLoaded, theme, attemptedThemeLoad]);
  
  return (
    <div 
      className={`h-screen w-full bg-transparent ${isIOSSafari ? 'ios-safari-page' : ''}`}
      style={{ height: isIOSSafari ? 'calc(var(--vh, 1vh) * 100)' : '100vh' }}
    >
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat isThemeLoading={isLoadingTheme} />
      </div>
      <IOSFallbackInput show={isIOSSafari && showFallbackInput} />
    </div>
  );
};

export default Index;
