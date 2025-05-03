
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, ThumbsUp, ThumbsDown, Trash, Reply, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Message as MessageType } from '@/types/chat';
import { stripMarkdown } from '@/utils/text-utils';

interface MessageContextMenuProps {
  message: MessageType;
  children: React.ReactNode;
  onCopy?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onReaction?: (reaction: 'like' | 'dislike') => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  children,
  onCopy = () => {},
  onDelete = () => {},
  onReply = () => {},
  onReaction = () => {},
}) => {
  const isUser = message.sender === 'user';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied to clipboard');
    onCopy();
  };
  
  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = stripMarkdown(message.content);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        utterance.voice = voices.find(voice => voice.default) || voices[0];
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      window.speechSynthesis.speak(utterance);
      toast.success('Reading message aloud');
    } else {
      toast.error('Text-to-speech is not supported in your browser');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 backdrop-blur-lg bg-popover/90">
        <ContextMenuItem onClick={handleCopy} className="flex items-center gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          <span>Copy</span>
        </ContextMenuItem>
        
        {!isUser && (
          <ContextMenuItem onClick={handleReadAloud} className="flex items-center gap-2 cursor-pointer">
            <Volume2 className="h-4 w-4" />
            <span>Read Aloud</span>
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={() => onReaction('like')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <ThumbsUp className="h-4 w-4" />
          <span>Like</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={() => onReaction('dislike')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <ThumbsDown className="h-4 w-4" />
          <span>Dislike</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onReply} className="flex items-center gap-2 cursor-pointer">
          <Reply className="h-4 w-4" />
          <span>Reply</span>
        </ContextMenuItem>
        
        {isUser && (
          <ContextMenuItem 
            onClick={onDelete}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash className="h-4 w-4" />
            <span>Delete</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
