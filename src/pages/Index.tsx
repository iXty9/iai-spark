
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/utils/logging';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const { isThemeLoaded, refreshTheme } = useTheme();
  
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
  
  // Ensure theme is loaded and force refresh if needed
  useEffect(() => {
    // Force refresh theme immediately on index page mount to ensure proper setup
    logger.info('Index component mounted, forcing theme refresh', { module: 'index' });
    refreshTheme().then(() => {
      logger.info('Initial theme refresh completed in Index component', { module: 'index' });
    });
    
    // Secondary refresh after delay to catch any race conditions
    const secondRefreshTimer = setTimeout(() => {
      if (!isThemeLoaded) {
        logger.info('Performing secondary theme refresh in Index component', { module: 'index' });
        refreshTheme();
      }
    }, 800);
    
    return () => {
      clearTimeout(secondRefreshTimer);
    };
  }, [refreshTheme, isThemeLoaded]);
  
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
