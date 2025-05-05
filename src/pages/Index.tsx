
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
  const { isThemeLoaded, theme } = useTheme();
  const [attemptedThemeLoad, setAttemptedThemeLoad] = useState(false);
  
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
      // Only attempt to force load theme once
      if (!isThemeLoaded && !attemptedThemeLoad) {
        logger.info('Attempting to force load theme on Index component mount', { module: 'index' });
        setAttemptedThemeLoad(true);
        
        try {
          // Wait 1 second to allow normal theme loading to complete first
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // If theme is still not loaded, force reload settings
          if (!isThemeLoaded) {
            logger.info('Force loading theme settings', { module: 'index' });
            await forceReloadSettings();
          }
        } catch (error) {
          logger.error('Error during automatic theme loading', error, { module: 'index' });
        }
      }
    };
    
    loadThemeIfNeeded();
  }, [isThemeLoaded, attemptedThemeLoad]);
  
  // Log when theme is loaded to help with debugging
  useEffect(() => {
    if (isThemeLoaded) {
      logger.info('Theme loaded in Index component', { 
        module: 'index',
        theme,
        attemptedForceLoad: attemptedThemeLoad
      });
    }
  }, [isThemeLoaded, theme, attemptedThemeLoad]);
  
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
