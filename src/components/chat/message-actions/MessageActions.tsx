
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Volume2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { TokenInfo } from '@/types/chat';
import { ActionTooltip } from './ActionTooltip';
import { TokenInfoDialog } from './TokenInfoDialog';
import { stripMarkdown } from '@/utils/text-utils';
import { sendFeedbackWebhook, FeedbackType } from '@/services/webhook/feedback-webhook';

interface MessageActionsProps {
  messageId: string;
  content: string;
  tokenInfo?: TokenInfo;
  isAuthenticated: boolean;
  userInfo?: { username?: string; first_name?: string; last_name?: string } | null;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ 
  messageId, 
  content,
  tokenInfo,
  isAuthenticated,
  userInfo
}) => {
  const [showTokenInfo, setShowTokenInfo] = React.useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<FeedbackType | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<FeedbackType | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = stripMarkdown(content);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        utterance.voice = voices.find(voice => voice.default) || voices[0];
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onerror = () => {
        toast.error('Could not read message aloud');
      };
      
      window.speechSynthesis.speak(utterance);
      toast.success('Reading message aloud');
    } else {
      toast.error('Text-to-speech is not supported in your browser');
    }
  };

  const handleTokenInfo = () => {
    if (tokenInfo) {
      setShowTokenInfo(true);
    } else {
      toast.error('No token usage information available');
    }
  };

  const handleFeedback = async (feedbackType: FeedbackType) => {
    if (!isAuthenticated) {
      toast.error('Please log in to provide feedback');
      return;
    }

    if (feedbackSent === feedbackType) {
      toast.info(`You've already provided ${feedbackType === 'thumbs_up' ? 'positive' : 'negative'} feedback for this message`);
      return;
    }

    setFeedbackLoading(feedbackType);
    
    try {
      const result = await sendFeedbackWebhook(feedbackType, content, isAuthenticated, userInfo);
      
      if (result.success) {
        setFeedbackSent(feedbackType);
        toast.success(`Thank you for your ${feedbackType === 'thumbs_up' ? 'positive' : 'negative'} feedback!`);
      } else {
        toast.error(result.error || 'Failed to send feedback');
      }
    } catch (error) {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setFeedbackLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <ActionTooltip 
        icon={ThumbsUp} 
        label="Helpful response" 
        onClick={() => handleFeedback('thumbs_up')}
        disabled={!isAuthenticated || feedbackLoading !== null}
        loading={feedbackLoading === 'thumbs_up'}
        active={feedbackSent === 'thumbs_up'}
      />
      <ActionTooltip 
        icon={ThumbsDown} 
        label="Not helpful" 
        onClick={() => handleFeedback('thumbs_down')}
        disabled={!isAuthenticated || feedbackLoading !== null}
        loading={feedbackLoading === 'thumbs_down'}
        active={feedbackSent === 'thumbs_down'}
      />
      <ActionTooltip icon={Copy} label="Copy to clipboard" onClick={handleCopy} />
      <ActionTooltip icon={Volume2} label="Read aloud" onClick={handleReadAloud} />
      <ActionTooltip 
        icon={Info} 
        label="Token usage info" 
        onClick={handleTokenInfo}
        disabled={!tokenInfo}
      />

      {tokenInfo && (
        <TokenInfoDialog 
          open={showTokenInfo}
          onOpenChange={setShowTokenInfo}
          tokenInfo={tokenInfo}
        />
      )}
    </div>
  );
};
