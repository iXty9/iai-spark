
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Trash2, Sun, Moon, Code, 
  Upload, RefreshCw, MoreVertical 
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/SupaThemeContext';
import { useDevMode } from '@/store/use-dev-mode';
import { toast } from "@/hooks/use-toast";
import { usePWA } from '@/hooks/use-pwa';
import { versionService } from '@/services/pwa/versionService';

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
  const { theme, setTheme } = useTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  const { user } = useAuth();
  const { needsUpdate, isUpdating, updateApp, isInstalled } = usePWA();
  
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

  // Function to handle force reloading theme using supa-themes
  const handleReloadTheme = async () => {
    try {
      // Show loading toast
      toast({
        title: "Loading Theme",
        description: "Fetching default theme settings...",
        duration: 1500,
      });

      // Use supa-themes service to reset to defaults
      const { supaThemes } = await import('@/services/supa-themes/core');
      const success = await supaThemes.resetToDefaults();
      
      if (success) {
        toast({
          title: "Theme Loaded",
          description: "Default theme applied successfully",
          duration: 3000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Theme Load Failed",
          description: "Could not load default theme settings",
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

  // Function to handle PWA update check
  const handleCheckForUpdates = async () => {
    try {
      toast({
        title: "Checking for Updates",
        description: "Looking for the latest version...",
        duration: 2000,
      });
      
      const hasUpdate = await versionService.checkForUpdates();
      
      if (hasUpdate) {
        // If update is available, trigger the update flow
        await updateApp();
      } else {
        toast({
          title: "Up to Date",
          description: "You're running the latest version",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast({
        variant: "destructive",
        title: "Update Check Failed",
        description: "Could not check for updates. Please try again.",
      });
    }
  };
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {!isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="relative rounded-full min-h-9 min-w-9 max-h-9 max-w-9 md:min-h-10 md:min-w-10 md:max-h-10 md:max-w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm"
              >
                {theme === 'dark' ? <Sun className="h-6 w-6 md:h-6 md:w-6" /> : <Moon className="h-6 w-6 md:h-6 md:w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {user && <NotificationCenter />}
        
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative rounded-full min-h-9 min-w-9 max-h-9 max-w-9 md:min-h-10 md:min-w-10 md:max-h-10 md:max-w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm"
                  aria-label="Actions menu"
                >
                  <MoreVertical className="h-6 w-6 md:h-6 md:w-6" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>More Actions</p>
            </TooltipContent>
          </Tooltip>
        <DropdownMenuContent 
          align="center"
          side="bottom"
          className="w-56"
          alignOffset={0}
          collisionPadding={6}
          avoidCollisions={true}
        >
          {/* Load Theme option */}
          <DropdownMenuItem onClick={handleReloadTheme} className="py-2.5">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>{isMobile ? "Load Theme" : "Load Default Theme"}</span>
          </DropdownMenuItem>
          
          {/* Check for Updates option - only show for PWA users */}
          {isInstalled && (
            <DropdownMenuItem 
              onClick={handleCheckForUpdates} 
              className="py-2.5" 
              disabled={isUpdating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>
                {isUpdating 
                  ? "Checking..." 
                  : (isMobile ? "Check Updates" : "Check for Updates")
                }
                {needsUpdate && !isUpdating && " (Available)"}
              </span>
            </DropdownMenuItem>
          )}
          
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
            <>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="py-2.5">
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </DropdownMenuItem>
              
            </>
          )}
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};
