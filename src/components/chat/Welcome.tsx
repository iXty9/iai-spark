
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onStartChat(message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      <div className="w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16">
            <AvatarImage 
              src="https://ixty.ai/wp-content/uploads/2024/11/faviconV4.png" 
              alt="Ixty AI Logo" 
            />
            <AvatarFallback>AI</AvatarFallback>
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
            placeholder="What can I assist you with today?"
            className="flex-1 rounded-full shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={!message.trim()} 
            className="rounded-full bg-[#ea384c] hover:bg-[#dd3333]"
          >
            Send <Send className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
