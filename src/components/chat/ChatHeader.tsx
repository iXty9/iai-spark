
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Sun, Moon, Code, Upload } from 'lucide-react';
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

interface ChatHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
  onImportChat: (messages: any[]) => void;
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
  hasMessages = false,
  dynamicPadding = { left: 4, right: 4 },
  isMobile = false
}) => {
  const { theme, setTheme } = useTheme();
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
  
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    logger.info(`Theme toggled to ${newTheme} mode`, { module: 'ui' });
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
            onClick={handleThemeToggle}
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
                <DropdownMenuItem onClick={handleThemeToggle} className="flex items-center">
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
