
import React, { useState } from 'react';
import { Message as ChatMessage } from '@/types/chat';
import { MessageAvatar } from './MessageAvatar';
import { MessageContent } from './message/MessageContent';
import { MessageActions } from './message-actions/MessageActions';
import { TimeMachineDialog } from './message/TimeMachineDialog';
import { formatSmartTimestamp } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAIAgentName } from '@/hooks/use-ai-agent-name';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}

export const Message: React.FC<MessageProps> = ({ message, onRetry }) => {
  const isUser = message.sender === 'user';
  const isProactive = message.source === 'proactive';
  const { user, profile } = useAuth();
  const { aiAgentName } = useAIAgentName();
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  
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
      return aiAgentName; // Use dynamic AI agent name
    }
  };

  // Construct complete TokenInfo object for the MessageActions component
  const getTokenInfo = () => {
    // Check if we have any token-related data
    if (message.tokenInfo || message.threadId) {
      const tokenInfo = {
        threadId: message.threadId,
        promptTokens: message.tokenInfo?.promptTokens,
        completionTokens: message.tokenInfo?.completionTokens,
        totalTokens: message.tokenInfo?.totalTokens,
      };
      
      return tokenInfo;
    }
    
    return undefined;
  };
  
  return (
    <TooltipProvider>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <MessageAvatar sender={message.sender} />
          <div className={`mx-3 ${isUser ? 'text-right' : 'text-left'}`}>
            {/* Display name with theme-based coloring */}
            <div className={`text-xs mb-1 ${isUser ? 'text-right user-name-text' : 'text-left ai-name-text'}`}>
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
            
            {/* Message Actions for AI messages (but not proactive ones since they don't have token info) */}
            {message.sender === 'ai' && !isProactive && (
              <div className="mt-2">
                <MessageActions
                  messageId={message.id}
                  content={message.content}
                  tokenInfo={getTokenInfo()}
                  isAuthenticated={!!user}
                  userInfo={profile}
                  messageType="ai"
                />
              </div>
            )}
            
            {/* Enhanced timestamp with clock icon */}
            <div className={`mt-1 flex items-center gap-1 text-xs ${isUser ? 'justify-end user-timestamp' : 'justify-start ai-timestamp'}`}>
              <span>{formatSmartTimestamp(message.timestamp)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setTimeMachineOpen(true)}
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Time Machine</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      
      <TimeMachineDialog
        open={timeMachineOpen}
        onOpenChange={setTimeMachineOpen}
        initialTimestamp={message.timestamp}
      />
    </TooltipProvider>
  );
};
