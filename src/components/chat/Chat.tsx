
import React, { useState, useEffect } from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/hooks/use-toast';
import { forceReloadSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ChatProps {
  isThemeLoading?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ isThemeLoading = false }) => {
  const { theme, reloadTheme, isThemeLoaded, loadError, isBackgroundLoading } = useTheme();
  const [reloadAttempts, setReloadAttempts] = useState(0);
  const [isManuallyReloading, setIsManuallyReloading] = useState(false);
  
  // Effect to automatically retry theme loading if background fails
  useEffect(() => {
    if (isThemeLoaded && loadError && reloadAttempts < 2) {
      logger.info('Auto-retrying theme load due to error', { 
        module: 'chat',
        error: loadError,
        attempt: reloadAttempts + 1
      });
      
      // Wait a bit before retrying
      const timer = setTimeout(() => {
        setReloadAttempts(prev => prev + 1);
        reloadTheme();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isThemeLoaded, loadError, reloadAttempts, reloadTheme]);
  
  // Function to reload theme by toggling light/dark mode and back
  const handleReloadTheme = async () => {
    try {
      setIsManuallyReloading(true);
      
      // Log that we're handling the reload request
      logger.info('Chat component handling reload theme request', { module: 'chat' });
      
      // Fetch new settings first to ensure we have latest
      const settings = await forceReloadSettings();
      
      if (settings && settings.default_theme_settings) {
        logger.info('Found default theme in settings during manual reload', { 
          module: 'chat',
          settingsKeys: Object.keys(settings)
        });
      } else {
        logger.warn('No default theme found in settings during manual reload', { 
          module: 'chat' 
        });
      }
      
      // Call the reload function from useTheme hook
      reloadTheme();
      
      toast({
        title: "Theme Reload Triggered",
        description: "Theme reload has been triggered",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error during theme reload:', error);
      logger.error('Error during theme reload in Chat component', error, { module: 'chat' });
      
      toast({
        variant: "destructive",
        title: "Theme Load Failed",
        description: "Could not load default theme settings",
        duration: 3000,
      });
    } finally {
      // Set manually reloading to false after a delay to allow time for the reload to finish
      setTimeout(() => {
        setIsManuallyReloading(false);
      }, 3000);
    }
  };
  
  // Determine if we should show the loading state
  const showThemeLoading = isThemeLoading || isManuallyReloading || isBackgroundLoading;
  
  // Render error state if there's a theme loading error
  if (isThemeLoaded && loadError && reloadAttempts >= 2) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {loadError}. Please try reloading the theme.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleReloadTheme} 
            className="w-full"
            disabled={isManuallyReloading}
          >
            {isManuallyReloading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reloading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Theme
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <ChatContainer 
      className="bg-transparent" 
      onReloadTheme={handleReloadTheme}
      isThemeLoading={showThemeLoading}
    />
  );
};
