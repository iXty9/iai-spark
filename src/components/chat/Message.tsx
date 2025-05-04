
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

  // Enhanced bubble styling with no border
  const bubbleBase = 
    'rounded-2xl px-4 py-2 max-w-[80vw] md:max-w-[70%] min-w-[140px] shadow-md transition-all break-words backdrop-blur-md'; 

  // Use CSS variables for colors to respect user theme settings
  const bubbleUser =
    'bg-[var(--user-bubble-color)] text-left text-[var(--user-text-color)] ml-auto ' +
    'backdrop-blur-md';

  const bubbleAI =
    'bg-[var(--ai-bubble-color)] text-left text-[var(--ai-text-color)] mr-auto ' +
    'backdrop-blur-md';

  return (
    <div
      className={cn(
        'message py-2 w-full flex',
        isUser ? 'justify-end' : 'justify-start',
        message.pending && 'opacity-70'
      )}
      aria-label={`${isUser ? 'Your' : 'Ixty AI'} message`}
    >
      {/* AI avatar appears before the message content */}
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-start mt-1 mr-1">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn('flex items-center text-xs mb-1', isUser ? 'justify-end' : 'justify-start')}>
          <span className="font-medium">{displayName}</span>
          {/* User avatar appears right after the username */}
          {isUser && (
            <div className="flex-shrink-0 w-4 h-4 ml-1">
              <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
            </div>
          )}
        </div>
        <div
          className={cn(
            bubbleBase,
            isUser ? bubbleUser : bubbleAI,
            isUser ? 'user-message-bubble' : 'ai-message-bubble',
            'mb-1'
          )}
          style={{
            opacity: isUser ? 'var(--user-bubble-opacity)' : 'var(--ai-bubble-opacity)'
          }}
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
      {/* Remove user avatar from here as it's now next to username */}
    </div>
  );
};
