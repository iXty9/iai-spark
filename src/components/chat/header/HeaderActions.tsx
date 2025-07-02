
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, Trash2, Sun, Moon, Code, 
  Upload, RefreshCw, MoreVertical 
} from 'lucide-react';
import { SupaMenu } from '@/components/supa-menu';
import { MenuItem } from '@/services/supa-menu/types';
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
  
  const handleDevModeToggle = () => {
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
  
  // Build menu items dynamically
  const menuItems: MenuItem[] = [
    {
      id: 'load-theme',
      label: isMobile ? "Load Theme" : "Load Default Theme",
      shortLabel: "Load Theme",
      icon: RefreshCw,
      onClick: handleReloadTheme,
    },
    ...(hasMessages ? [{
      id: 'export-chat',
      label: isMobile ? "Export" : "Export Chat",
      shortLabel: "Export",
      icon: Download,
      onClick: onExportChat,
    }] : []),
    {
      id: 'import-chat',
      label: isMobile ? "Import" : "Import Chat", 
      shortLabel: "Import",
      icon: Upload,
      onClick: onImportClick,
    },
    {
      id: 'clear-chat',
      label: isMobile ? "Clear" : "Clear Chat",
      shortLabel: "Clear", 
      icon: Trash2,
      onClick: onClearChat,
      separator: true, // Add separator after this item
    },
    {
      id: 'dev-mode',
      label: isMobile ? `Dev ${isDevMode ? '(On)' : '(Off)'}` : `Dev Mode ${isDevMode ? '(On)' : '(Off)'}`,
      shortLabel: `Dev ${isDevMode ? '(On)' : '(Off)'}`,
      icon: Code,
      onClick: handleDevModeToggle,
    },
    ...(isMobile ? [{
      id: 'theme-toggle',
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      shortLabel: theme === 'dark' ? 'Light' : 'Dark',
      icon: theme === 'dark' ? Sun : Moon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }] : []),
  ];

  return (
    <div className="flex items-center gap-3">
      {!isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative rounded-full h-9 w-9 md:h-8 md:w-8 border border-border/40 hover:border-[#dd3333]/30 transition-all duration-200 flex-shrink-0 shadow-sm"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 md:h-4 md:w-4" /> : <Moon className="h-5 w-5 md:h-4 md:w-4" />}
        </Button>
      )}
      
      <SupaMenu
        items={menuItems}
        trigger={<MoreVertical className="h-5 w-5 md:h-4 md:w-4" />}
        triggerClassName="aria-label-actions-menu"
      />
    </div>
  );
};
