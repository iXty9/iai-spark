
import React from 'react';
import { Chat } from '@/components/chat/Chat';

const Index = () => {
  return (
    <div className="h-screen w-full bg-background">
      {/* Added iOS-specific wrapper div with full height and explicit display mode */}
      <div className="h-full w-full ios-viewport-fix">
        <Chat />
      </div>
    </div>
  );
};

export default Index;
