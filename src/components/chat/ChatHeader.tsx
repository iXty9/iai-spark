
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Sun, Moon, Code } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';
import { useDevMode } from '@/store/use-dev-mode';
import { UserMenu } from '@/components/UserMenu';

interface ChatHeaderProps {
  onClearChat: () => void;
  onExportChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClearChat, onExportChat }) => {
  const { theme, setTheme } = useTheme();
  const { isDevMode, toggleDevMode } = useDevMode();
  
  return (
    <header className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center">
        <img 
          src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png" 
          alt="Ixty AI" 
          className="h-8 w-8 mr-3"
        />
        <div>
          <h1 className="text-lg font-bold">Ixty AI</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        <UserMenu />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportChat}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export Chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearChat}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear Chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleDevMode}>
              <Code className="mr-2 h-4 w-4" />
              <span>Dev Mode {isDevMode ? '(On)' : '(Off)'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
