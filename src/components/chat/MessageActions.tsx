
import React from 'react';
import { ThumbsUp, ThumbsDown, Copy, Volume2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface MessageActionsProps {
  messageId: string;
  content: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ messageId, content }) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleReadAloud = () => {
    // Safari requires user interaction before playing audio
    // Create an audio context only when needed
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(content);
      
      // Set voice to a common one that works across browsers
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a default voice
        const defaultVoice = voices.find(voice => voice.default) || voices[0];
        utterance.voice = defaultVoice;
      }
      
      // Set parameters that improve compatibility
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Handle errors
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        toast.error('Could not read message aloud');
      };
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
      toast.success('Reading message aloud');
    } else {
      toast.error('Text-to-speech is not supported in your browser');
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Helpful response</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not helpful</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy to clipboard</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReadAloud}>
              <Volume2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Read aloud</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Token usage info">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Token usage information not available in this version</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
