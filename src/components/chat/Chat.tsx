
import React, { useRef, useEffect, useState } from 'react';
import { CollapsibleHeader } from './CollapsibleHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Welcome } from './Welcome';
import { useChat } from '@/hooks/use-chat';

export const Chat = () => {
  const {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  } = useChat();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Effect to start interaction tracking
  useEffect(() => {
    if (messages.length > 0 && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [messages.length, hasInteracted]);

  return (
    <div className="chat-container flex flex-col h-full overflow-hidden">
      <CollapsibleHeader 
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />
      
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 ? (
          <Welcome onStartChat={startChat} />
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            scrollRef={scrollRef}
          />
        )}
      </div>
      
      {/* Always render the input bar regardless of message state */}
      <div className={`p-4 border-t bg-background sticky bottom-0 z-10 ${messages.length === 0 ? 'hidden md:block' : ''}`}>
        <MessageInput
          message={message}
          onChange={setMessage}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
