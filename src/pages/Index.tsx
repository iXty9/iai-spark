
import React from 'react';
import { Chat } from '@/components/chat/Chat';

const Index = () => {
  return (
    <div className="min-h-screen p-2 md:p-4 bg-background">
      <div className="h-full w-full mx-auto">
        <Chat />
      </div>
    </div>
  );
};

export default Index;
