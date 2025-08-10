
import React, { useRef, FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { useIOSFixes } from '@/hooks/use-ios-fixes';
import { InputButtons } from './message-input/InputButtons';

interface MessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  message, 
  onChange, 
  onSubmit, 
  isLoading 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isMobile = useIsMobile();
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useTextareaResize(textareaRef, message);
  useIOSFixes(formRef, message, isIOSSafari);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading) {
      onSubmit(e);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Shift+Enter is pressed, allow default behavior (line break)
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior for Shift+Enter (creates a line break)
    }
    
    // Only submit on plain Enter key (no Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && message.trim() && !isLoading) {
      e.preventDefault();
      onSubmit();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleFileAttached = (content: string, fileName: string) => {
    // Encode attachment inline using a structured block the webhook can parse
    // content is a data URL (e.g., data:image/png;base64,....)
    const mimeMatch = /^data:([^;]+);base64,/.exec(content || '');
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const attachmentBlock = `\n[attachment name="${fileName}" mime="${mime}"]\n${content}\n[/attachment]\n`;
    const newMessage = message ? `${message}\n${attachmentBlock}` : attachmentBlock;
    onChange(newMessage);
  };
  const handleVoiceTranscript = (transcript: string) => {
    // Append voice transcript to current message
    const newMessage = message ? `${message} ${transcript}` : transcript;
    onChange(newMessage);
    
    // Focus the textarea after voice input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      id="message-input-container"
      className="border-0 shadow-none"
      style={{ paddingBottom: `var(--safe-area-inset-bottom, 0px)` }}
    >
      <div className="flex items-end gap-3 w-full">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you?"
            className="pr-10 resize-none min-h-[44px] max-h-[120px] rounded-2xl py-3 px-4 !scrollbar-none bg-background/80 backdrop-blur-sm border-border/50 focus:bg-background/90 focus:border-border transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={isLoading}
            aria-label="Message input"
            rows={1}
            spellCheck="true"
          />
        </div>
        
        <InputButtons 
          message={message}
          isLoading={isLoading}
          onSendClick={() => {
            if (message.trim() && !isLoading) {
              onSubmit();
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
              }
            }
          }}
          onFileAttached={handleFileAttached}
          onVoiceTranscript={handleVoiceTranscript}
        />
      </div>
    </form>
  );
};
