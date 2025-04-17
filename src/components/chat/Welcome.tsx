
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  const [message, setMessage] = React.useState('');
  const isMobile = useIsMobile();
  const [avatarError, setAvatarError] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onStartChat(message);
    }
  };

  const handleImageError = () => {
    console.log("Avatar image failed to load");
    setAvatarError(true);
  };

  // Use a local placeholder for more reliability
  const avatarImageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ea384c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M12 16v-4'%3E%3C/path%3E%3Cpath d='M12 8h.01'%3E%3C/path%3E%3C/svg%3E";

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      <div className="w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16">
            {!avatarError ? (
              <AvatarImage 
                src={avatarImageUrl}
                alt="Ixty AI Logo" 
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback className="bg-[#ea384c]/10 text-[#ea384c] font-bold">AI</AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold text-[#ea384c]">Ixty AI</h1>
            <p className="text-muted-foreground">
              "The Everywhere Intelligent Assistant"
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
            className="flex-1 rounded-full shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={!message.trim()} 
            className="rounded-full bg-[#ea384c] hover:bg-[#dd3333]"
          >
            {isMobile ? <Send className="h-4 w-4" /> : <>Send <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
};
