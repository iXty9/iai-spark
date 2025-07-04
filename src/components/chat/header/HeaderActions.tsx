
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
import { useTheme } from '@/contexts/SupaThemeContext';
import { useDevMode } from '@/store/use-dev-mode';
import { toast } from "@/hooks/use-toast";

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
  
  return (
    <div className="flex items-center gap-3">
      {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative rounded-full h-9 w-9 md:h-10 md:w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm"
          >
          {theme === 'dark' ? <Sun className="h-5 w-5 md:h-5 md:w-5" /> : <Moon className="h-5 w-5 md:h-5 md:w-5" />}
        </Button>
      )}
      
      {user && <NotificationCenter />}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative rounded-full h-9 w-9 md:h-10 md:w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm"
            aria-label="Actions menu"
          >
            <MoreVertical className="h-5 w-5 md:h-5 md:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="center"
          side="bottom"
          className="w-56"
          alignOffset={0}
          collisionPadding={2}
          avoidCollisions={true}
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
  );
};
