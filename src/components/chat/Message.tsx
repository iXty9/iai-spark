
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

  // Chat bubble styling
  const bubbleBase =
    'rounded-2xl px-4 py-2 max-w-[80vw] md:max-w-[70%] shadow-sm transition-all';
  const bubbleUser =
    'bg-gradient-to-tr from-primary/50 via-primary/30 to-primary/20 text-right text-white ml-auto border border-primary/30 backdrop-blur-lg';
  const bubbleAI =
    'bg-muted/50 text-left text-foreground mr-auto border border-border/20 backdrop-blur-[2px]';

  return (
    <div
      className={cn(
        'message py-2 w-full flex',
        isUser ? 'justify-end' : 'justify-start',
        message.pending && 'opacity-70'
      )}
      aria-label={`${isUser ? 'Your' : 'Ixty AI'} message`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-end mr-1">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            bubbleBase,
            isUser ? bubbleUser : bubbleAI,
            'mb-1'
          )}
        >
          <MessageContent message={message} isUser={isUser} />
        </div>
        <div className={cn('flex items-center text-xs opacity-60', isUser ? 'justify-end' : 'justify-start')}>
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && (
            <span className="ml-2">
              <MessageActions messageId={message.id} content={message.content} tokenInfo={message.tokenInfo} />
            </span>
          )}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-end ml-1">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
    </div>
  );
};

