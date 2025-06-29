import React from 'react';
import { Message as ChatMessage } from '@/types/chat';
import { MessageAvatar } from './MessageAvatar';
import { MessageContent } from './message/MessageContent';
import { MessageActions } from './message-actions/MessageActions';
import { formatTimestamp } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface MessageProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}

export const Message: React.FC<MessageProps> = ({ message, onRetry }) => {
  const isUser = message.sender === 'user';
  const isProactive = message.source === 'proactive';
  const { user, profile } = useAuth();
  
  // Get display name for the message
  const getDisplayName = () => {
    if (isUser) {
      if (!user) return 'Guest';
      if (profile?.first_name && profile?.last_name) {
        return `${profile.first_name} ${profile.last_name}`;
      }
      if (profile?.username) return profile.username;
      return user.email?.split('@')[0] || 'User';
    } else {
      return 'AI Assistant';
    }
  };

  // Construct complete TokenInfo object for the MessageActions component
  const getTokenInfo = () => {
    // Return undefined only if BOTH tokenInfo and threadId are missing
    if (!message.tokenInfo && !message.threadId) return undefined;
    
    return {
      threadId: message.threadId,
      promptTokens: message.tokenInfo?.promptTokens,
      completionTokens: message.tokenInfo?.completionTokens,
      totalTokens: message.tokenInfo?.totalTokens,
    };
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <MessageAvatar sender={message.sender} />
        <div className={`mx-3 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Display name */}
          <div className={`text-xs text-muted-foreground mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {getDisplayName()}
          </div>
          
          <div
            className={`inline-block p-3 rounded-lg ${
              isUser
                ? 'user-message-bubble'
                : 'ai-message-bubble'
            } ${isProactive ? 'border-l-2 border-blue-400' : ''}`}
          >
            {/* Subtle indicator for proactive messages */}
            {isProactive && (
              <div className="flex items-center gap-1 mb-1 opacity-70">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
                <span className="text-xs">Proactive</span>
              </div>
            )}
            
            <MessageContent message={message} isUser={isUser} />
          </div>
          
          {/* Message Actions for AI messages */}
          {message.sender === 'ai' && (
            <div className="mt-2">
              <MessageActions
                messageId={message.id}
                content={message.content}
                tokenInfo={getTokenInfo()}
                isAuthenticated={!!user}
                userInfo={profile}
              />
            </div>
          )}
          
          {/* Timestamp */}
          <div className={`mt-1 text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};
