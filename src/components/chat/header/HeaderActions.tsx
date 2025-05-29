import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Trash2, Sun, Moon, Code, 
  Upload, RefreshCw, MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  isCompact?: boolean;
}

export const HeaderActions = ({ 
  onClearChat, 
  onExportChat, 
  onImportChat,
  onReloadTheme,
  onImportClick,
  hasMessages = false,
  dynamicPadding = { right: 4 },
  isMobile = false,
  isCompact = false
}: HeaderActionsProps) => {
  const { theme, setTheme } = useTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  
  const handleDevModeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      toast({
        title: `Dev Mode ${isDevMode ? 'Disabled' : 'Enabled'}`,
        description: `Developer tools are now ${isDevMode ? 'disabled' : 'enabled'}`,
        duration: 2000,
      });
      
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

  const handleReloadTheme = async () => {
    try {
      toast({
        title: "Loading Theme",
        description: "Fetching default theme settings...",
        duration: 1500,
      });

      const settings = await fetchAppSettings();
      
      if (settings.default_theme_settings) {
        const themeSettings = JSON.parse(settings.default_theme_settings);
        
        const currentTheme = theme === 'light' 
          ? themeSettings.lightTheme 
          : themeSettings.darkTheme;
        
        if (currentTheme) {
          applyThemeChanges(currentTheme);
          
          if (themeSettings.backgroundImage) {
            const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
            applyBackgroundImage(themeSettings.backgroundImage, opacity);
          } else {
            applyBackgroundImage(null, 0.5);
          }
          
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

  if (isCompact) {
    return (
      <div className="flex items-center gap-1">
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-8 w-8"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border shadow-md rounded-xl z-50">
            <DropdownMenuItem onClick={handleReloadTheme}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Load Theme</span>
            </DropdownMenuItem>
            
            {hasMessages && (
              <DropdownMenuItem onClick={onExportChat}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export</span>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={onImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Import</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onClearChat}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleDevModeToggle}>
              <Code className="mr-2 h-4 w-4" />
              <span>Dev {isDevMode ? '(On)' : '(Off)'}</span>
            </DropdownMenuItem>
            
            {isMobile && (
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  
  return (
    <div 
      className="flex items-center gap-2 justify-center w-full"
      style={{ 
        marginRight: isMobile ? '0' : `calc(${dynamicPadding.right / 4}rem - 1rem)` 
      }}
    >
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </Button>
      
      <Button variant="ghost" size="sm" onClick={handleReloadTheme}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Load Theme
      </Button>
      
      {hasMessages && (
        <Button variant="ghost" size="sm" onClick={onExportChat}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      )}
      
      <Button variant="ghost" size="sm" onClick={onImportClick}>
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
      
      <Button variant="ghost" size="sm" onClick={onClearChat}>
        <Trash2 className="h-4 w-4 mr-2" />
        Clear
      </Button>
      
      <Button variant="ghost" size="sm" onClick={handleDevModeToggle}>
        <Code className="h-4 w-4 mr-2" />
        Dev {isDevMode ? '(On)' : '(Off)'}
      </Button>
    </div>
  );
};
