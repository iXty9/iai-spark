
import React from 'react';
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

  return (
    <div className="chat-container flex flex-col">
      <CollapsibleHeader 
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <Welcome onStartChat={startChat} />
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
          />
        )}
      </div>
      {messages.length > 0 && (  // Only show MessageInput when there are messages
        <MessageInput
          message={message}
          onChange={setMessage}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
