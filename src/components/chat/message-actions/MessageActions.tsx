
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Volume2, Info, Check, VolumeX } from 'lucide-react';
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopySuccess(true);
    toast.success('Message copied to clipboard');
    
    // Reset copy success state after 2 seconds
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      // If already speaking, stop the speech
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        toast.info('Speech stopped');
        return;
      }

      // Start new speech
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
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast.error('Could not read message aloud');
      };
      
      window.speechSynthesis.speak(utterance);
      toast.success('Reading message aloud');
    } else {
      toast.error('Text-to-speech is not supported in your browser');
    }
  };

  const handleTokenInfo = () => {
    console.log('Token info button clicked, tokenInfo:', tokenInfo);
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

  // Enhanced check for token data with detailed logging
  const hasTokenData = React.useMemo(() => {
    console.log('=== MessageActions Token Data Check ===');
    console.log('Raw tokenInfo received:', tokenInfo);
    console.log('tokenInfo type:', typeof tokenInfo);
    console.log('tokenInfo is truthy:', !!tokenInfo);
    
    if (!tokenInfo) {
      console.log('No tokenInfo object provided');
      return false;
    }
    
    const hasThreadId = tokenInfo.threadId && tokenInfo.threadId.length > 0;
    const hasPromptTokens = tokenInfo.promptTokens !== undefined && tokenInfo.promptTokens !== null;
    const hasCompletionTokens = tokenInfo.completionTokens !== undefined && tokenInfo.completionTokens !== null;
    const hasTotalTokens = tokenInfo.totalTokens !== undefined && tokenInfo.totalTokens !== null;
    
    console.log('Token data breakdown:', {
      hasThreadId,
      threadIdValue: tokenInfo.threadId,
      hasPromptTokens,
      promptTokensValue: tokenInfo.promptTokens,
      hasCompletionTokens,
      completionTokensValue: tokenInfo.completionTokens,
      hasTotalTokens,
      totalTokensValue: tokenInfo.totalTokens
    });
    
    const result = hasThreadId || hasPromptTokens || hasCompletionTokens || hasTotalTokens;
    console.log('Final hasTokenData result:', result);
    console.log('=== End Token Data Check ===');
    
    return result;
  }, [tokenInfo]);

  console.log('MessageActions render:', {
    messageId,
    hasTokenData,
    tokenInfo,
    disabled: !hasTokenData
  });

  return (
    <div className="flex items-center gap-1 mt-2">
      <ActionTooltip 
        icon={ThumbsUp} 
        label="Helpful response" 
        onClick={() => handleFeedback('thumbs_up')}
        disabled={!isAuthenticated || feedbackLoading !== null}
        loading={feedbackLoading === 'thumbs_up'}
        active={feedbackSent === 'thumbs_up'}
        variant="success"
      />
      <ActionTooltip 
        icon={ThumbsDown} 
        label="Not helpful" 
        onClick={() => handleFeedback('thumbs_down')}
        disabled={!isAuthenticated || feedbackLoading !== null}
        loading={feedbackLoading === 'thumbs_down'}
        active={feedbackSent === 'thumbs_down'}
        variant="destructive"
      />
      <ActionTooltip 
        icon={copySuccess ? Check : Copy} 
        label={copySuccess ? "Copied!" : "Copy to clipboard"} 
        onClick={handleCopy}
        active={copySuccess}
        variant="success"
      />
      <ActionTooltip 
        icon={isSpeaking ? VolumeX : Volume2} 
        label={isSpeaking ? "Stop reading" : "Read aloud"} 
        onClick={handleReadAloud}
        variant="none"
      />
      <ActionTooltip 
        icon={Info} 
        label="Token usage info" 
        onClick={handleTokenInfo}
        disabled={!hasTokenData}
        variant="none"
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
