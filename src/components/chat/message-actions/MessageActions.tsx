import React from 'react';
import { ThumbsUp, ThumbsDown, Copy, Volume2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { TokenInfo } from '@/types/chat';
import { ActionTooltip } from './ActionTooltip';
import { TokenInfoDialog } from './TokenInfoDialog';
import { stripMarkdown } from '@/utils/strip-markdown';

interface MessageActionsProps {
  messageId: string;
  content: string;
  tokenInfo?: TokenInfo;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ 
  messageId, 
  content,
  tokenInfo 
}) => {
  const [showTokenInfo, setShowTokenInfo] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanedContent = stripMarkdown(content);
      const utterance = new SpeechSynthesisUtterance(cleanedContent);
      
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

  return (
    <div className="flex items-center gap-1 mt-2">
      <ActionTooltip icon={ThumbsUp} label="Helpful response" />
      <ActionTooltip icon={ThumbsDown} label="Not helpful" />
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
