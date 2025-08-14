
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Trash2, Sun, Moon, Monitor, Code, 
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
  const { mode, setMode } = useTheme();
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

  // Theme preference state - sync with SupaThemes service
  const [themePref, setThemePref] = React.useState<'light' | 'dark' | 'system'>('light');
  const mediaQueryRef = React.useRef<MediaQueryList | null>(null);
  const mediaHandlerRef = React.useRef<((e: MediaQueryListEvent) => void) | null>(null);

  const applySystem = () => {
    if (typeof window === 'undefined') return null;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setMode(mql.matches ? 'dark' : 'light');
    return mql;
  };

  const enableSystemMode = () => {
    const mql = applySystem();
    if (!mql) return;
    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
    if (mediaQueryRef.current && mediaHandlerRef.current) {
      mediaQueryRef.current.removeEventListener('change', mediaHandlerRef.current);
    }
    mql.addEventListener('change', handler);
    mediaQueryRef.current = mql;
    mediaHandlerRef.current = handler;
  };

  const disableSystemMode = () => {
    if (mediaQueryRef.current && mediaHandlerRef.current) {
      mediaQueryRef.current.removeEventListener('change', mediaHandlerRef.current);
    }
    mediaQueryRef.current = null;
    mediaHandlerRef.current = null;
  };

  // Initialize theme preference from localStorage on mount
  React.useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem('theme_mode_pref') : null) as 'light' | 'dark' | 'system' | null;
    if (stored === 'system') {
      setThemePref('system');
      // For anonymous users, show system preference in UI but don't auto-apply OS preference
      if (!user) {
        // Don't enable system mode for anonymous users on app load
        disableSystemMode();
      } else {
        enableSystemMode();
      }
    } else if (stored === 'light' || stored === 'dark') {
      setThemePref(stored);
      disableSystemMode();
      // Don't override if SupaThemes has already set the mode from database
    } else {
      // Use current mode from SupaThemes service
      setThemePref(mode);
      disableSystemMode();
    }
    return () => disableSystemMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onThemeChange = (value: 'light' | 'dark' | 'system') => {
    setThemePref(value);
    
    // Update localStorage for consistency
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_mode_pref', value);
    }
    
    if (value === 'system') {
      enableSystemMode();
    } else {
      disableSystemMode();
      // Use SupaThemes setMode which handles both localStorage and database
      setMode(value);
    }
  };

  // Function to handle force reloading theme using centralized SupaThemes service
  const handleReloadTheme = async () => {
    try {
      // Show loading toast
      toast({
        title: "Loading Theme",
        description: "Fetching default theme settings...",
        duration: 1500,
      });

      // Use the centralized SupaThemes service to reset to defaults
      const { supaThemes } = await import('@/services/supa-themes/core');
      const success = await supaThemes.resetToDefaults();
      
      if (success) {
        // Update local theme preference to match reset
        const currentMode = supaThemes.getState().mode;
        setThemePref(currentMode);
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme_mode_pref', currentMode);
        }
        
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
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    aria-label={`Theme: ${themePref === 'system' ? 'System' : (mode === 'dark' ? 'Dark' : 'Light')}`}
                    className="relative rounded-full min-h-9 min-w-9 max-h-9 max-w-9 md:min-h-10 md:min-w-10 md:max-h-10 md:max-w-10 aspect-square border border-border/40 hover:border-primary/30 transition-all duration-200 flex-shrink-0 shadow-sm"
                  >
                    {mode === 'dark' ? <Sun className="h-6 w-6 md:h-6 md:w-6" /> : <Moon className="h-6 w-6 md:h-6 md:w-6" />}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Theme: {themePref === 'system' ? 'System' : (mode === 'dark' ? 'Dark' : 'Light')}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent 
              align="start"
              side="bottom"
              className="z-50 w-fit p-3"
              alignOffset={0}
              collisionPadding={6}
              avoidCollisions={true}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1">
                  <Button 
                    variant={themePref === 'light' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full min-h-9 min-w-9 max-h-9 max-w-9 border border-border/40"
                    onClick={() => onThemeChange('light')}
                    aria-label="Switch to Light"
                  >
                    <Sun className="h-5 w-5" />
                  </Button>
                  <span className="text-xs">Light</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button 
                    variant={themePref === 'dark' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full min-h-9 min-w-9 max-h-9 max-w-9 border border-border/40"
                    onClick={() => onThemeChange('dark')}
                    aria-label="Switch to Dark"
                  >
                    <Moon className="h-5 w-5" />
                  </Button>
                  <span className="text-xs">Dark</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button 
                    variant={themePref === 'system' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-full min-h-9 min-w-9 max-h-9 max-w-9 border border-border/40"
                    onClick={() => onThemeChange('system')}
                    aria-label="Use System"
                  >
                    <Monitor className="h-5 w-5" />
                  </Button>
                  <span className="text-xs">System</span>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <DropdownMenuItem onClick={() => onThemeChange('light')} className="py-2.5">
                <Sun className="mr-2 h-4 w-4" />
                <span className={themePref === 'light' ? 'font-medium' : ''}>Light</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onThemeChange('dark')} className="py-2.5">
                <Moon className="mr-2 h-4 w-4" />
                <span className={themePref === 'dark' ? 'font-medium' : ''}>Dark</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onThemeChange('system')} className="py-2.5">
                <Monitor className="mr-2 h-4 w-4" />
                <span className={themePref === 'system' ? 'font-medium' : ''}>System</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};
