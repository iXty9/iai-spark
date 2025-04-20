
import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import { MessageActions } from './MessageActions';
import { MessageAvatar } from './message/MessageAvatar';
import { MessageContent } from './message/MessageContent';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const [aiIconError, setAiIconError] = React.useState(false);
  
  return (
    <div 
      className={cn(
        "message py-6",
        isUser ? "user-message" : "ai-message",
        message.pending && "opacity-70"
      )}
      aria-label={`${isUser ? 'Your' : 'Ixty AI'} message`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">
            {isUser ? 'You' : 'Ixty AI'}
          </p>
          <div className="markdown-content whitespace-pre-wrap text-sm">
            <MessageContent message={message} isUser={isUser} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs opacity-60">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {!isUser && <MessageActions messageId={message.id} content={message.content} />}
          </div>
        </div>
      </div>
    </div>
  );
};
