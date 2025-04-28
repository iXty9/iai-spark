
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
    console.log("Form submission triggered");
    
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
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
      e.preventDefault();
      console.log("Enter key submission triggered");
      onSubmit();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className={`message-input-container ${isIOSSafari ? 'ios-debug' : ''} border-0 shadow-none`} // remove borders and shadows
      style={{ borderTop: 'none', boxShadow: 'none' }} // double assurance
    >
      <div className="flex items-end gap-2 w-full">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you?"
            className="pr-10 resize-none min-h-[40px] max-h-[120px] rounded-2xl py-2.5 !scrollbar-none"
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
        />
      </div>
    </form>
  );
};
