
import React from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeProps {
  onStartChat: (message: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <img 
        src="https://ixty.ai/wp-content/uploads/2024/11/faviconV4.png" 
        alt="Ixty AI Logo" 
        className="w-24 h-24 mb-6"
      />
      
      <h1 className="text-3xl font-bold mb-2">Welcome to Ixty AI</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Your intelligent assistant powered by advanced AI technology.
      </p>
      
      <div className="space-y-4 w-full max-w-md">
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
              className="justify-start text-left h-auto py-3 px-4"
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
