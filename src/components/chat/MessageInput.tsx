
import React, { useRef, FormEvent, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { useIOSFixes } from '@/hooks/use-ios-fixes';
import { InputButtons } from './message-input/InputButtons';
import { ParsedAttachment, isImageMime, toDataUrl } from '@/utils/attachment-utils';
import { X } from 'lucide-react';

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

  const [attachments, setAttachments] = useState<ParsedAttachment[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const composeWithAttachments = () => {
      if (attachments.length === 0) return message;
      const blocks = attachments
        .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
        .join('');
      return message ? `${message}\n${blocks}` : blocks;
    };

    if ((message.trim() || attachments.length > 0) && !isLoading) {
      const composed = composeWithAttachments();
      onChange(composed);
      // Ensure state update flushes before submit handler reads it
      setTimeout(() => onSubmit(), 0);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Clear local attachments after sending
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Shift+Enter is pressed, allow default behavior (line break)
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior for Shift+Enter (creates a line break)
    }
    
    // Only submit on plain Enter key (no Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && (message.trim() || attachments.length > 0) && !isLoading) {
      e.preventDefault();
      // Build and send with attachments
      const blocks = attachments
        .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
        .join('');
      const composed = attachments.length > 0 ? (message ? `${message}\n${blocks}` : blocks) : message;
      onChange(composed);
      setTimeout(() => onSubmit(), 0);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setAttachments([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleFileAttached = (content: string, fileName: string) => {
    // Keep attachment out of the input box; store locally for preview and send on submit
    const match = /^data:([^;]+);base64,(.*)$/s.exec(content || '');
    const mime = match ? match[1] : 'application/octet-stream';
    const data = match ? match[2] : content;
    setAttachments(prev => [...prev, { name: fileName, mime, data }]);
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
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-1">
                  {isImageMime(att.mime) ? (
                    <img src={toDataUrl(att)} alt={att.name} className="h-8 w-8 object-cover rounded" loading="lazy" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs">
                      {att.name.split('.').pop()?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs max-w-[140px] truncate" title={att.name}>{att.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${att.name}`}
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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
            if ((message.trim() || attachments.length > 0) && !isLoading) {
              const blocks = attachments
                .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
                .join('');
              const composed = attachments.length > 0 ? (message ? `${message}\n${blocks}` : blocks) : message;
              onChange(composed);
              setTimeout(() => onSubmit(), 0);
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
              }
              setAttachments([]);
            }
          }}
          onFileAttached={handleFileAttached}
          onVoiceTranscript={handleVoiceTranscript}
        />
      </div>
    </form>
  );
};
