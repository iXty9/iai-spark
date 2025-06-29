
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
import { useCentralizedTheme } from '@/hooks/use-centralized-theme';
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
  dynamicPadding = { right: 0 },
  isMobile = false
}: HeaderActionsProps) => {
  const { theme, setTheme } = useCentralizedTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
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
    <div className="flex items-center gap-3">
      {!isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleThemeToggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-9 w-9 shadow-sm"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            className="shadow-sm min-h-[2.25rem] px-4"
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="bg-background/95 backdrop-blur-md border border-border/30 shadow-lg rounded-xl z-50 min-w-[160px]"
        >
          {/* Load Theme option */}
          <DropdownMenuItem onClick={handleReloadTheme} className="py-2.5">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>{isMobile ? "Load Theme" : "Load Default Theme"}</span>
          </DropdownMenuItem>
          
          {hasMessages && (
            <DropdownMenuItem onClick={onExportChat} className="py-2.5">
              <Download className="mr-2 h-4 w-4" />
              <span>{isMobile ? "Export" : "Export Chat"}</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={onImportClick} className="py-2.5">
            <Upload className="mr-2 h-4 w-4" />
            <span>{isMobile ? "Import" : "Import Chat"}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onClearChat} className="py-2.5">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{isMobile ? "Clear" : "Clear Chat"}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleDevModeToggle} className="py-2.5">
            <Code className="mr-2 h-4 w-4" />
            <span>{isMobile ? `Dev ${isDevMode ? '(On)' : '(Off)'}` : `Dev Mode ${isDevMode ? '(On)' : '(Off)'}`}</span>
          </DropdownMenuItem>
          
          {isMobile && (
            <DropdownMenuItem onClick={handleThemeToggle} className="py-2.5">
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
