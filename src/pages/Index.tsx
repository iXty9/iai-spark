
import React, { useEffect, useState } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import { logger } from '@/utils/logging';

// Initialize global state if not already present
if (!window.APP_STATE) {
  window.APP_STATE = {
    themeLoadAttempts: 0,
    themeLoaded: false,
    lastThemeLoadTime: 0
  };
}

const THEME_LOAD_TIMEOUT = 10000; // 10 seconds max to load theme
const MAX_THEME_LOAD_ATTEMPTS = 2; // Maximum number of load attempts per session

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  const { 
    isThemeLoaded, 
    isThemeLoading, 
    loadError, 
    reloadTheme 
  } = useTheme();
  
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
  
  // Safe theme loading with circuit breaker
  useEffect(() => {
    // Break infinite loop - limit to max attempts
    if (window.APP_STATE.themeLoadAttempts >= MAX_THEME_LOAD_ATTEMPTS) {
      logger.warn('Maximum theme load attempts reached, stopping to prevent loop', 
        { module: 'index', attempts: window.APP_STATE.themeLoadAttempts });
      setIsLoadingTheme(false);
      return;
    }

    // Break loop - don't retry too quickly
    const now = Date.now();
    if (now - window.APP_STATE.lastThemeLoadTime < 2000 && window.APP_STATE.themeLoadAttempts > 0) {
      logger.warn('Theme load attempts too frequent, delaying to prevent loop', { module: 'index' });
      setIsLoadingTheme(false);
      return;
    }
    
    // Log status for debugging
    logger.info('Index component checking theme status', { 
      module: 'index',
      isThemeLoaded, 
      isThemeLoading,
      loadError,
      attempts: window.APP_STATE.themeLoadAttempts
    });
    
    // If theme is already loaded, update state
    if (isThemeLoaded) {
      window.APP_STATE.themeLoaded = true;
      setIsLoadingTheme(false);
      return;
    }
    
    // If theme is currently loading, wait for it to complete
    if (isThemeLoading) {
      setIsLoadingTheme(true);
      
      // Set safety timeout to prevent infinite loading
      if (!loadTimeout) {
        const timeout = setTimeout(() => {
          logger.warn('Theme loading timeout reached', { module: 'index' });
          setIsLoadingTheme(false);
          
          // Apply fallback theme through body class if needed
          if (!document.body.classList.contains('light') && !document.body.classList.contains('dark')) {
            document.body.classList.add('light');
          }
        }, THEME_LOAD_TIMEOUT);
        
        setLoadTimeout(timeout);
      }
      
      return () => {
        if (loadTimeout) clearTimeout(loadTimeout);
      };
    }
    
    // Only attempt to load theme if there have been no previous attempts or if there was an error
    if (!window.APP_STATE.themeLoaded || loadError) {
      // Track attempt to prevent loops
      window.APP_STATE.themeLoadAttempts++;
      window.APP_STATE.lastThemeLoadTime = now;
      
      logger.info('Attempting theme load', { 
        module: 'index', 
        attempt: window.APP_STATE.themeLoadAttempts 
      });
      
      // Set timeout for safety
      const timeout = setTimeout(() => {
        logger.warn('Theme loading timeout reached', { module: 'index' });
        setIsLoadingTheme(false);
      }, THEME_LOAD_TIMEOUT);
      
      setLoadTimeout(timeout);
      
      // Only call reloadTheme on first attempt to prevent cascading reloads
      if (window.APP_STATE.themeLoadAttempts <= 1) {
        setTimeout(() => {
          reloadTheme();
        }, 100);
      } else {
        // On subsequent attempts, just wait for timeout
        setIsLoadingTheme(false);
      }
    } else {
      // Theme is already loaded or we've hit max attempts
      setIsLoadingTheme(false);
    }
    
    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
    };
  }, [isThemeLoaded, isThemeLoading, loadError, reloadTheme, loadTimeout]);

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
