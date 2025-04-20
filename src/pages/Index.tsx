
import React from 'react';
import { Chat } from '@/components/chat/Chat';
import { useIOSSafari } from '@/hooks/use-ios-safari';
import { IOSFallbackInput } from '@/components/chat/IOSFallbackInput';

const Index = () => {
  const { isIOSSafari, showFallbackInput } = useIOSSafari();
  
  return (
    <div className={`h-screen w-full bg-background ${isIOSSafari ? 'ios-safari-page' : ''}`}>
      <div className={`h-full w-full ${isIOSSafari ? 'ios-viewport-fix' : ''}`}>
        <Chat />
      </div>
      <IOSFallbackInput show={isIOSSafari && showFallbackInput} />
    </div>
  );
};

export default Index;
