
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center h-full space-y-3">
      <img 
        src="https://ixty.ai/wp-content/uploads/2024/11/faviconV4.png" 
        alt="Ixty AI Logo" 
        className="w-12 h-12 mb-2"
      />
      
      <h1 className="text-2xl font-bold">Welcome to Ixty AI</h1>
      <p className="text-muted-foreground mb-4 max-w-md">
        Your intelligent assistant powered by advanced AI technology.
      </p>
      
      <div className="space-y-3 w-full max-w-md">
        <p className="text-lg font-medium">What can I assist you with today?</p>
        
        <div className="grid gap-2">
          {[
            "Tell me about your services",
            "How can Ixty AI help my business?",
            "What features do you offer?"
          ].map((question) => (
            <Button 
              key={question}
              variant="outline" 
              className="justify-start text-left h-auto py-2 px-3"
              onClick={() => onStartChat(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
