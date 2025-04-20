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
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                     /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  useEffect(() => {
    console.log("MessageInput mounted");
    
    if (isIOSSafari) {
      console.log("Applying iOS Safari specific fixes to MessageInput");
    }
    
    return () => {
      console.log("MessageInput unmounted");
    };
  }, [isIOSSafari]);
  
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
          
          if (isIOSSafari && (rect.height === 0 || computedStyle.display === 'none')) {
            console.log("Attempting to fix invisible form on iOS Safari");
            
            formEl.style.display = 'flex';
            formEl.style.visibility = 'visible';
            formEl.style.position = 'relative';
            formEl.style.zIndex = '1000';
            formEl.style.width = '100%';
            formEl.style.minHeight = '50px';
            
            const parent = formEl.parentElement;
            if (parent) {
              parent.style.display = 'block';
              parent.style.visibility = 'visible';
              parent.style.position = 'relative';
            }
          }
        }
      };
      
      checkVisibility();
      const timer = setTimeout(checkVisibility, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [message, isIOSSafari]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className={`message-input-container ${isIOSSafari ? 'ios-debug' : ''}`}
    >
      <div className="flex items-end gap-2 w-full">
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
          className="rounded-full shrink-0"
          onClick={handleSendClick}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
