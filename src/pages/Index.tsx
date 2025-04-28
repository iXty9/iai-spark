
import React, { useEffect } from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  // Apply background image and theme settings from localStorage or profile
  useEffect(() => {
    try {
      // Only apply background to the chat interface for logged in users
      if (user) {
        let backgroundImage = null;
        let backgroundOpacity = "0.1";
        
        // If user is logged in and has profile settings, use those
        if (profile && profile.theme_settings) {
          try {
            const themeSettings = JSON.parse(profile.theme_settings);
            backgroundImage = themeSettings.backgroundImage;
            backgroundOpacity = themeSettings.backgroundOpacity || "0.1";
          } catch (e) {
            console.error('Error parsing theme settings from profile:', e);
          }
        } else {
          // Fallback to localStorage
          backgroundImage = localStorage.getItem('backgroundImage');
          backgroundOpacity = localStorage.getItem('backgroundOpacity') || "0.1";
        }
        
        if (backgroundImage) {
          document.body.style.backgroundImage = `url(${backgroundImage})`;
          document.documentElement.style.setProperty('--bg-opacity', backgroundOpacity);
          document.body.classList.add('with-bg-image');
        } else {
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('with-bg-image');
        }
      } else {
        // Remove background for non-logged in users
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('with-bg-image');
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
