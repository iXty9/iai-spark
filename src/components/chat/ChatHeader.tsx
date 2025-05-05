import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Sun, Moon, Code, Upload, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';
import { useDevMode } from '@/store/use-dev-mode';
import { UserMenu } from '@/components/UserMenu';
import { importChat } from '@/services/import/importService';
import { toast } from "@/hooks/use-toast";
import { forceReloadSettings } from '@/services/admin/settingsService';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { logger } from '@/utils/logging';

interface ChatHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: any[]) => void;
  onReloadTheme?: () => void;
  hasMessages?: boolean;
  dynamicPadding?: {
    left: number;
    right: number;
  };
  isMobile?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onClearChat, 
  onExportChat,
  onImportChat,
  onReloadTheme,
  hasMessages = false,
  dynamicPadding = { left: 4, right: 4 },
  isMobile = false
}) => {
  const { theme, setTheme, isThemeLoaded } = useTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleLogoClick = () => {
    window.open('https://ixty9.com', '_blank', 'noopener,noreferrer');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const messages = await importChat(file);
      onImportChat(messages);
    } catch (error) {
      console.error('Import failed:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDevModeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      // Show toast notification
      toast({
        title: `Dev Mode ${isDevMode ? 'Disabled' : 'Enabled'}`,
        description: `Developer tools are now ${isDevMode ? 'disabled' : 'enabled'}`,
        duration: 2000,
      });
      
      // Toggle with slight delay to allow React to process changes
      setTimeout(() => {
        toggleDevMode();
      }, 0);
    } catch (err) {
      console.error('Error toggling dev mode:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to toggle developer mode",
      });
    }
  };

  // New function to handle force reloading theme
  const handleReloadTheme = async () => {
    try {
      // Show loading toast
      toast({
        title: "Loading Theme",
        description: "Fetching default theme settings...",
        duration: 1500,
      });

      // Force reload settings from backend
      const settings = await forceReloadSettings();
      
      // Add additional logging to see exactly what's coming back from settings
      console.log("Theme settings loaded:", settings);
      logger.info('Theme settings loaded from forceReloadSettings', { 
        module: 'theme',
        settingsKeys: Object.keys(settings),
        hasDefaultTheme: !!settings.default_theme_settings
      });
      
      if (settings.default_theme_settings) {
        // Parse theme settings
        const themeSettings = JSON.parse(settings.default_theme_settings);
        
        // Apply theme colors based on current mode
        const currentTheme = theme === 'light' 
          ? themeSettings.lightTheme 
          : themeSettings.darkTheme;
        
        if (currentTheme) {
          // Apply theme colors
          applyThemeChanges(currentTheme);
          
          // Apply background if available
          if (themeSettings.backgroundImage) {
            const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
            applyBackgroundImage(themeSettings.backgroundImage, opacity);
          } else {
            applyBackgroundImage(null, 0.5);
          }
          
          // Show success toast
          toast({
            title: "Theme Loaded",
            description: `Default theme applied successfully (${theme} mode)`,
            duration: 3000,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Theme Error",
            description: "Default theme settings are incomplete",
          });
        }
      } else {
        // If we get here, we know for sure no default theme exists in the database
        toast({
          variant: "destructive",
          title: "No Default Theme",
          description: "No default theme settings found in database. Please create a default theme in settings.",
        });
        
        // Apply hardcoded fallback theme to ensure something is visible
        const fallbackLightTheme = {
          backgroundColor: '#ffffff',
          primaryColor: '#ea384c',
          textColor: '#000000',
          accentColor: '#9b87f5',
          userBubbleColor: '#ea384c',
          aiBubbleColor: '#9b87f5',
          userBubbleOpacity: 0.3,
          aiBubbleOpacity: 0.3,
          userTextColor: '#000000',
          aiTextColor: '#000000'
        };
        
        const fallbackDarkTheme = {
          backgroundColor: '#121212',
          primaryColor: '#ea384c',
          textColor: '#ffffff',
          accentColor: '#9b87f5',
          userBubbleColor: '#ea384c',
          aiBubbleColor: '#9b87f5',
          userBubbleOpacity: 0.3,
          aiBubbleOpacity: 0.3,
          userTextColor: '#ffffff',
          aiTextColor: '#ffffff'
        };
        
        // Apply the fallback theme based on current mode
        const fallbackTheme = theme === 'light' ? fallbackLightTheme : fallbackDarkTheme;
        applyThemeChanges(fallbackTheme);
        applyBackgroundImage(null, 0.5);
        
        logger.info('Applied fallback theme due to missing default theme', { 
          module: 'theme',
          theme 
        });
      }
      
      // Call the parent's reload handler if provided
      if (onReloadTheme) {
        onReloadTheme();
      }
    } catch (error) {
      console.error('Failed to reload theme:', error);
      toast({
        variant: "destructive",
        title: "Theme Load Failed",
        description: "Could not load default theme settings",
      });
    }
  };
  
  return (
    <header className={`p-4 ${isMobile ? 'rounded-b-lg' : ''} flex items-center justify-between`}>
      <div 
        className="flex items-center cursor-pointer" 
        onClick={handleLogoClick}
        style={{ 
          marginLeft: isMobile ? '0' : `calc(${dynamicPadding.left / 4}rem - 1rem)` 
        }}
      >
        <img 
          src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
          alt="Ixty AI" 
          className="h-8 w-8 mr-3"
        />
        <div>
          <h1 className="text-lg font-bold">Ixty AI</h1>
        </div>
      </div>
      
      <div 
        className="flex items-center gap-2"
        style={{ 
          marginRight: isMobile ? '0' : `calc(${dynamicPadding.right / 4}rem - 1rem)` 
        }}
      >
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}
        
        <UserMenu />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={isMobile ? "xs" : "sm"}>
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-none shadow-md rounded-xl">
            {/* New Load Theme option */}
            <DropdownMenuItem onClick={handleReloadTheme} className={isMobile ? "flex items-center" : ""}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>{isMobile ? "Load Theme" : "Load Default Theme"}</span>
            </DropdownMenuItem>
            
            {!isMobile && hasMessages && (
              <DropdownMenuItem onClick={onExportChat}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export Chat</span>
              </DropdownMenuItem>
            )}
            {isMobile && hasMessages && (
              <DropdownMenuItem onClick={onExportChat} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                <span>Export</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleImportClick} className={isMobile ? "flex items-center" : ""}>
              <Upload className="mr-2 h-4 w-4" />
              <span>{isMobile ? "Import" : "Import Chat"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearChat} className={isMobile ? "flex items-center" : ""}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{isMobile ? "Clear" : "Clear Chat"}</span>
            </DropdownMenuItem>
            {!isMobile && (
              <DropdownMenuItem onClick={handleDevModeToggle}>
                <Code className="mr-2 h-4 w-4" />
                <span>Dev Mode {isDevMode ? '(On)' : '(Off)'}</span>
              </DropdownMenuItem>
            )}
            {isMobile && (
              <>
                <DropdownMenuItem onClick={handleDevModeToggle} className="flex items-center">
                  <Code className="mr-2 h-4 w-4" />
                  <span>Dev {isDevMode ? '(On)' : '(Off)'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center">
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>
    </header>
  );
};
