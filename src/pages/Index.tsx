
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  
  // Apply any background image and theme settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedBackgroundImage = localStorage.getItem('backgroundImage');
      const savedBackgroundOpacity = localStorage.getItem('backgroundOpacity');
      
      if (savedBackgroundImage) {
        document.body.style.backgroundImage = `url(${savedBackgroundImage})`;
        document.documentElement.style.setProperty('--bg-opacity', savedBackgroundOpacity || '0.1');
        document.body.classList.add('with-bg-image');
      }
      
      // Apply theme colors from localStorage
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const themeKey = `${currentTheme}Theme`;
      const savedTheme = localStorage.getItem(themeKey);
      
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        const root = document.documentElement;
        
        root.style.setProperty('--background-color', theme.backgroundColor);
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--accent-color', theme.accentColor);
      }
    } catch (error) {
      console.error('Error applying saved theme settings:', error);
    }
  }, [location.pathname]);
  
  return (
    <div className={`h-screen w-full bg-background ${isIOSSafari ? 'ios-safari-page' : ''}`}>
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      <IOSFallbackInput show={isIOSSafari && showFallbackInput} />
    </div>
  );
};

export default Index;
