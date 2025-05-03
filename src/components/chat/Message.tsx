import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message as MessageType } from '@/types/chat';
import { MessageActions } from './MessageActions';
import { MessageAvatar } from './message/MessageAvatar';
import { MessageContent } from './message/MessageContent';
import { useAuth } from '@/contexts/AuthContext';
import { MessageContextMenu } from './message-actions/MessageContextMenu';
import { useMessageGestures } from '@/hooks/use-message-gestures';
import { haptics } from '@/utils/haptic-feedback';
import { toast } from 'sonner';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { user, profile } = useAuth();
  const isUser = message.sender === 'user';
  const [aiIconError, setAiIconError] = React.useState(false);
  const [isReacted, setIsReacted] = useState<'like' | 'dislike' | null>(null);
  
  // Setup gesture handlers
  const { bind, ref, onLongPress } = useMessageGestures({
    onSwipeLeft: () => {
      // Swipe left to copy message
      navigator.clipboard.writeText(message.content);
      haptics.success();
      toast.success('Message copied to clipboard');
    },
    onSwipeRight: () => {
      // Swipe right to react with like
      if (!isReacted) {
        setIsReacted('like');
        haptics.selection();
        toast.success('Message liked');
      } else {
        setIsReacted(null);
        haptics.light();
        toast('Reaction removed');
      }
    },
    onLongPress: () => {
      // Long press could show additional options
      haptics.medium();
    }
  });
  
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
    'bg-[var(--user-bubble-color)] text-right text-[var(--user-text-color)] ml-auto ' +
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
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-end mr-1">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
      
      <MessageContextMenu 
        message={message}
        onReaction={(reaction) => {
          setIsReacted(isReacted === reaction ? null : reaction);
          haptics.selection();
          toast.success(reaction === 'like' ? 'Message liked' : 'Message disliked');
        }}
        onCopy={() => haptics.light()}
        onReply={() => {
          haptics.medium();
          toast.info('Reply feature coming soon');
        }}
        onDelete={() => {
          haptics.warning();
          toast.info('Delete feature coming soon');
        }}
      >
        <div 
          {...bind()} 
          ref={ref}
          className={cn(
            'flex flex-col',
            isUser ? 'items-end' : 'items-start',
            'transition-transform duration-200'
          )}
          onContextMenu={onLongPress}
        >
          <div className={cn('flex items-center text-xs mb-1', isUser ? 'justify-end' : 'justify-start')}>
            <span className="font-medium">{displayName}</span>
          </div>
          
          <div
            className={cn(
              bubbleBase,
              isUser ? bubbleUser : bubbleAI,
              isUser ? 'user-message-bubble' : 'ai-message-bubble',
              'mb-1',
              isReacted === 'like' && 'ring-2 ring-green-400/50',
              isReacted === 'dislike' && 'ring-2 ring-red-400/50',
              'transition-all duration-200',
              'relative' // Add relative positioning for reaction indicator
            )}
            style={{
              opacity: isUser ? 'var(--user-bubble-opacity)' : 'var(--ai-bubble-opacity)'
            }}
          >
            <MessageContent message={message} isUser={isUser} />
            
            {/* Add reaction indicator if present */}
            {isReacted && (
              <div className={`absolute ${isUser ? 'left-0' : 'right-0'} -bottom-2 transform ${isUser ? '-translate-x-1/2' : 'translate-x-1/2'} bg-background rounded-full p-0.5 shadow-sm`}>
                <div className={`text-xs ${isReacted === 'like' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full px-2 py-0.5`}>
                  {isReacted === 'like' ? '👍' : '👎'}
                </div>
              </div>
            )}
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
      </MessageContextMenu>
      
      {isUser && (
        <div className="flex-shrink-0 w-6 h-6 self-end ml-1">
          <MessageAvatar isUser={isUser} onAiIconError={() => setAiIconError(true)} />
        </div>
      )}
    </div>
  );
};
