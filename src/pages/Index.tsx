
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useTheme } from '@/hooks/use-theme';
import { logger } from '@/utils/logging';
import { clearSettingsCache } from '@/services/admin/settingsService';

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
  
  // Ensure theme is loaded, and refresh it if needed
  useEffect(() => {
    // Force clear settings cache on index page mount for fresh theme
    clearSettingsCache();
    
    // Force refresh theme on initial load to ensure proper application
    if (!isThemeLoaded) {
      logger.info('Forcing theme refresh on Index component mount', { module: 'index' });
      setTimeout(() => {
        refreshTheme();
      }, 100); // Small delay to ensure DOM is ready
    } else {
      logger.info('Theme already loaded in Index component', { module: 'index' });
    }
    
    // Second refresh after a delay to catch any race conditions
    const secondRefreshTimer = setTimeout(() => {
      logger.info('Performing secondary theme refresh for stability', { module: 'index' });
      refreshTheme();
    }, 800);
    
    return () => {
      clearTimeout(secondRefreshTimer);
    };
  }, [isThemeLoaded, refreshTheme]);
  
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
