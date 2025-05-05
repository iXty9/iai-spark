
import React, { useState } from 'react';
import { Menu, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  onClearChat?: () => void;
  onExportChat?: () => void;
  onImportChat?: (messages: Message[]) => void;
  onReloadTheme?: () => void;
  messages?: Message[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  className,
  onClearChat,
  onExportChat,
  onImportChat,
  onReloadTheme,
  messages = [],
  isSidebarOpen = false,
  onToggleSidebar
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          console.error("No content found in file");
          setIsUploading(false);
          return;
        }
        
        const parsedMessages = JSON.parse(content) as Message[];
        if (Array.isArray(parsedMessages) && onImportChat) {
          onImportChat(parsedMessages);
        }
      } catch (error) {
        console.error("Error parsing JSON file:", error);
      } finally {
        setIsUploading(false);
        // Reset the input value to allow re-uploading the same file
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!messages || messages.length === 0) return;
    
    if (onExportChat) {
      onExportChat();
    } else {
      // Fallback export functionality
      const jsonStr = JSON.stringify(messages, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={cn("h-full flex flex-col relative", className, {
      "sidebar-open": isSidebarOpen
    })}>
      <div className="absolute top-4 right-4 z-50">
        {onToggleSidebar && (
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden mr-2"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onReloadTheme && (
              <DropdownMenuItem onClick={onReloadTheme}>
                Reload Theme
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={handleExport} disabled={messages.length === 0}>
              Export Chat
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <label className="flex w-full cursor-pointer items-center">
                Import Chat
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </DropdownMenuItem>
            
            {onClearChat && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={onClearChat}
                  disabled={messages.length === 0}
                >
                  Clear Chat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {children}
    </div>
  );
};

export { ChatLayout };
