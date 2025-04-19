
import React, { useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Mic } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  
  // Log when component mounts/unmounts to track lifecycle
  useEffect(() => {
    console.log("MessageInput mounted");
    
    return () => {
      console.log("MessageInput unmounted");
    };
  }, []);
  
  // Monitor form visibility
  useEffect(() => {
    if (formRef.current) {
      const checkVisibility = () => {
        const formEl = formRef.current;
        if (formEl) {
          const rect = formEl.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(formEl);
          
          console.log("MessageInput form visibility:", {
            rect: {
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
              width: rect.width
            },
            isVisible: rect.height > 0 && rect.width > 0,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex
          });
        }
      };
      
      // Check immediately and after a delay
      checkVisibility();
      const timer = setTimeout(checkVisibility, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [message]); // Re-check when message changes
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      
      // Ensure the textarea resizes properly
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Form submission triggered");
    
    if (message.trim() && !isLoading) {
      onSubmit(e);
      // Reset textarea height after submission
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Check visibility after submission (with delay)
      setTimeout(() => {
        if (formRef.current) {
          const rect = formRef.current.getBoundingClientRect();
          console.log("Post-submission form position:", {
            rect,
            visible: rect.height > 0 && rect.width > 0
          });
        } else {
          console.log("Form ref not available after submission");
        }
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
      e.preventDefault();
      console.log("Enter key submission triggered");
      onSubmit();
      // Reset textarea height after submission
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSendClick = () => {
    console.log("Send button clicked");
    if (message.trim() && !isLoading) {
      onSubmit();
      // Reset textarea height after submission
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="message-input-container ios-input-fix"
      id="message-input-form"
    >
      <div className="flex items-end gap-2">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="file-button shrink-0"
          aria-label="Upload file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you?"
            className="pr-10 resize-none min-h-[40px] max-h-[120px] rounded-2xl py-2.5"
            disabled={isLoading}
            aria-label="Message input"
            rows={1}
          />
        </div>
        
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="file-button shrink-0"
          aria-label="Voice input"
        >
          <Mic className="h-5 w-5" />
        </Button>
        
        <Button 
          type="button" 
          variant="default" 
          size="icon" 
          disabled={!message.trim() || isLoading}
          aria-label="Send message"
          className="rounded-full shrink-0 animate-[sonar-pulse_10s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          onClick={handleSendClick}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
