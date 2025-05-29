
import React from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import { MessageActions } from './MessageActions';
import { MessageAvatar } from './message/MessageAvatar';
import MessageContent from './message/MessageContent';
import { useAuth } from '@/contexts/AuthContext';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { user, profile } = useAuth();
  const isUser = message.sender === 'user';
  const [aiIconError, setAiIconError] = React.useState(false);
  
  // Get display name for the user messages - prioritizing username
  const getDisplayName = (): string => {
    if (!isUser) return 'Ixty AI';
    if (!user) return 'You';
    
    // Prioritize username over first/last name
    if (profile?.username) return profile.username;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return 'You';
  };

  const displayName = getDisplayName();

  // Enhanced bubble styling with no border and no shadow
  const bubbleBase = 
    'rounded-2xl px-4 py-2 max-w-[80vw] md:max-w-[70%] min-w-[140px] transition-all break-words backdrop-blur-md'; 

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
      {/* AI avatar appears before the message content with consistent spacing */}
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-start mt-1 mr-3">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
      
      {/* Message content with symmetrical spacing for user and AI messages */}
      <div className={cn(
        'flex flex-col', 
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Username text with dynamic name tag colors */}
        <div 
          className={cn(
            'text-xs mb-1 font-medium', 
            isUser ? 'text-right' : 'text-left'
          )}
          style={{
            color: isUser ? 'var(--user-name-color)' : 'var(--ai-name-color)'
          }}
        >
          {displayName}
        </div>
        
        {/* Message bubble */}
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
        
        {/* Timestamp and actions row */}
        <div className={cn(
          'flex items-center text-xs opacity-60', 
          isUser ? 'justify-end' : 'justify-start'
        )}>
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

      {/* User avatar appears after the message content with consistent spacing */}
      {isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-start mt-1 ml-3">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
    </div>
  );
};
