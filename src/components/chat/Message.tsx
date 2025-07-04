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
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
        <div className={`flex max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <MessageAvatar sender={message.sender} />
          <div className={`mx-3 ${isUser ? 'text-right' : 'text-left'}`}>
            {/* Display name with theme-based coloring */}
            <div className={`text-xs mb-1 ${isUser ? 'text-right user-name-text' : 'text-left ai-name-text'}`}>
              {getDisplayName()}
            </div>
            
            <div
              className={`inline-block p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                isUser
                  ? 'user-message-bubble'
                  : 'ai-message-bubble'
              } ${isProactive ? 'proactive-message-highlight' : ''}`}
            >
              <MessageContent message={message} isUser={isUser} />
            </div>
            
            {/* Message Actions for AI messages (including proactive ones) */}
            {message.sender === 'ai' && (
              <div className="mt-3">
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
