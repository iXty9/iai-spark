import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Volume2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface MessageActionsProps {
  messageId: string;
  content: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ messageId, content }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(content);
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const defaultVoice = voices.find(voice => voice.default) || voices[0];
        utterance.voice = defaultVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        toast.error('Could not read message aloud');
      };
      
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Token usage info">
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <p>Token usage information not available in this version</p>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};
