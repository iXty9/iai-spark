
import React, { useState } from 'react';
import { ChatContainer } from './chat-container/ChatContainer';
import { useTheme } from '@/hooks/use-theme';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ChatProps {
  isThemeLoading?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ isThemeLoading = false }) => {
  const { 
    reloadTheme, 
    isThemeLoaded, 
    loadError 
  } = useTheme();
  const [isManuallyReloading, setIsManuallyReloading] = useState(false);
  
  // Handle manual theme reload
  const handleReloadTheme = () => {
    try {
      setIsManuallyReloading(true);
      
      // Call the reload function
      reloadTheme();
      
      // Show toast
      toast({
        title: "Theme Reload Triggered",
        description: "Theme reload has been triggered",
        duration: 2000,
      });
      
      // Reset state after a delay
      setTimeout(() => {
        setIsManuallyReloading(false);
      }, 3000);
    } catch (error) {
      console.error('Error during theme reload:', error);
      
      toast({
        variant: "destructive",
        title: "Theme Load Failed",
        description: "Could not load theme settings",
        duration: 3000,
      });
      
      setIsManuallyReloading(false);
    }
  };
  
  // Determine if we should show loading state - simplified logic
  const showThemeLoading = isThemeLoading || isManuallyReloading;
  
  // Render error state if there's a theme loading error
  if (isThemeLoaded && loadError) {
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
