
import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import { MessageActions } from './MessageActions';
import { MessageAvatar } from './message/MessageAvatar';
import { MessageContent } from './message/MessageContent';
import { useAuth } from '@/contexts/AuthContext';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { user, profile } = useAuth();
  const isUser = message.sender === 'user';
  const [aiIconError, setAiIconError] = React.useState(false);
  
  // Get display name for the user messages
  const getDisplayName = (): string => {
    if (!isUser) return 'Ixty AI';
    if (!user) return 'User';
    
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    return 'User';
  };

  const displayName = getDisplayName();

  // Enhanced bubble styling with glassmorphism for better visibility with custom backgrounds
  const bubbleBase = 
    'rounded-2xl px-4 py-2 max-w-[80vw] md:max-w-[70%] min-w-[140px] shadow-md transition-all break-words backdrop-blur-md'; 

  // Use CSS variables for colors to respect user theme settings
  const bubbleUser =
    'bg-gradient-to-br from-[var(--user-bubble-color)]/20 to-[var(--user-bubble-color)]/40 text-right text-[var(--text-color)] ml-auto ' +
    'border border-[var(--user-bubble-color)]/30 backdrop-blur-md';

  const bubbleAI =
    'bg-gradient-to-br from-[var(--ai-bubble-color)]/20 to-[var(--ai-bubble-color)]/40 text-left text-[var(--text-color)] mr-auto ' +
    'border border-[var(--ai-bubble-color)]/30 backdrop-blur-md';

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
        <div className={cn('flex items-center text-xs mb-1', isUser ? 'justify-end' : 'justify-start')}>
          <span className="font-medium">{displayName}</span>
        </div>
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
