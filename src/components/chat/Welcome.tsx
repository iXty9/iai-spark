
import React from 'react';
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
          <img 
            src="/lovable-uploads/33df91d7-8c0f-429f-8666-4f309bb6d006.png" 
            alt="Ixty AI" 
            className="w-12 h-12"
          />
          
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-[#ea384c]">Ixty AI</h1>
            <p className="text-gray-600 text-sm">
              "The Everywhere Intelligent Assistant"
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What can I assist you with today?"
            className="flex-1 rounded-full shadow-md hover:shadow-lg transition-shadow"
          />
          <Button 
            type="submit" 
            disabled={!message.trim()}
            className="rounded-full bg-[#ea384c] hover:bg-[#c52c3f] transition-colors"
          >
            Send <Send className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

