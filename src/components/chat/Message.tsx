
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

  // Enhanced bubble styling with more visible light mode user bubbles
  const bubbleBase =
    'rounded-2xl px-4 py-2 max-w-[80vw] md:max-w-[70%] min-w-[180px] shadow transition-all break-words'; // increased min-width

  // Fixed light mode visibility with more contrast
  const bubbleUser =
    'bg-gradient-to-br from-primary/60 to-primary/80 text-right ml-auto border border-primary/30 backdrop-blur-lg ' +
    'dark:from-[#6E59A5]/80 dark:to-[#9b87f5]/50 dark:text-white ' +
    'light:bg-[#9b87f5]/90 light:text-white light:border-[#9b87f5]/60';

  const bubbleAI =
    'bg-muted/80 text-left text-foreground mr-auto border border-border/40 backdrop-blur-md ' +
    'dark:bg-black/30 dark:text-white dark:border-[#6E59A5] ' +
    'light:bg-white/90 light:text-black light:border-[#ccc]';

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
