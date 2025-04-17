
import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Circle, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  const [message, setMessage] = React.useState('');
  const isMobile = useIsMobile();
  const [avatarError, setAvatarError] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const submitMessage = () => {
    // Prevent empty messages or submitting while already processing
    if (!message.trim() || isSubmitting) return;
    
    // Set submitting state
    setIsSubmitting(true);
    
    // Actually send the message to parent component
    try {
      onStartChat(message.trim());
    } catch (error) {
      console.error("Error submitting message:", error);
      // If there's an error, reset the submitting state
      setIsSubmitting(false);
    }
    
    // Clear the input
    setMessage('');
  };

  const handleImageError = () => {
    console.log("Avatar image failed to load");
    setAvatarError(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      <div className="w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16 relative">
            {!avatarError ? (
              <AvatarImage 
                src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png"
                alt="Ixty AI Logo" 
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback className="bg-[#ea384c]/10 text-[#ea384c] font-bold flex items-center justify-center">
              <div className="relative">
                <Circle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#ea384c] w-full h-full" />
                <Info className="relative z-10 text-[#ea384c]" size={18} />
              </div>
            </AvatarFallback>
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
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
            className="flex-1 rounded-full shadow-sm"
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isSubmitting} 
            className="rounded-full bg-[#ea384c] hover:bg-[#dd3333]"
          >
            {isMobile ? <Send className="h-4 w-4" /> : <>Send <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
};
