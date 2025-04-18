
import React from 'react';
import { Chat } from '@/components/chat/Chat';

const Index = () => {
  return (
    <div className="h-screen w-full bg-background dark:bg-[#191919]">
      <div className="h-full w-full">
        <Chat />
      </div>
    </div>
  );
};

export default Index;
