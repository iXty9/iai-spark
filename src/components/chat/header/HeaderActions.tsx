
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Trash2, Sun, Moon, Code, 
  Upload, RefreshCw 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';
import { useDevMode } from '@/store/use-dev-mode';
import { toast } from "@/hooks/use-toast";
import { fetchAppSettings } from '@/services/admin/settingsService';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';

interface HeaderActionsProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: any[]) => void;
  onReloadTheme?: () => void;
  onImportClick: () => void;
  hasMessages?: boolean;
  dynamicPadding?: {
    right: number;
  };
  isMobile?: boolean;
}

export const HeaderActions = ({ 
  onClearChat, 
  onExportChat, 
  onImportChat,
  onReloadTheme,
  onImportClick,
  hasMessages = false,
  dynamicPadding = { right: 4 },
  isMobile = false
}: HeaderActionsProps) => {
  const { theme, setTheme } = useTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  
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

  // Function to handle force reloading theme
  const handleReloadTheme = async () => {
    try {
      // Show loading toast
      toast({
        title: "Loading Theme",
        description: "Fetching default theme settings...",
        duration: 1500,
      });

      // Force reload settings from backend
      const settings = await fetchAppSettings();
      
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
        toast({
          variant: "destructive",
          title: "No Default Theme",
          description: "No default theme settings found in database",
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={isMobile ? "xs" : "sm"}>
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-none shadow-md rounded-xl">
          {/* Load Theme option */}
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
          <DropdownMenuItem onClick={onImportClick} className={isMobile ? "flex items-center" : ""}>
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
    </div>
  );
};
