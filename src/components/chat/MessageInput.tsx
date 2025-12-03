import React, { useRef, FormEvent, useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { useIOSFixes } from '@/hooks/use-ios-fixes';
import { InputButtons } from './message-input/InputButtons';
import { ParsedAttachment, isImageMime, toDataUrl } from '@/utils/attachment-utils';
import { X } from 'lucide-react';
import { useFileUpload } from '@/hooks/chat/use-file-upload';
import { toast } from '@/hooks/use-toast';

interface MessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent, overrideMessage?: string) => void;
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
  const [interimText, setInterimText] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
  const { uploadFile, isImageType, isAllowedType } = useFileUpload();

  // Handle clipboard paste for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const dataUrl = await uploadFile(file);
          if (dataUrl) {
            // Parse the data URL to extract mime and base64
            const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
            const mime = match ? match[1] : 'image/png';
            const data = match ? match[2] : dataUrl;
            
            setAttachments(prev => [...prev, { 
              name: `pasted-image-${Date.now()}.${mime.split('/')[1] || 'png'}`, 
              mime, 
              data 
            }]);
            
            toast({
              title: "Image pasted",
              description: "Image added from clipboard",
            });
          }
        }
        return; // Only handle first image
      }
    }
  }, [uploadFile]);

  const composeWithAttachments = useCallback(() => {
    if (attachments.length === 0) return message;
    const blocks = attachments
      .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
      .join('');
    return message ? `${message}\n${blocks}` : blocks;
  }, [message, attachments]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if ((message.trim() || attachments.length > 0) && !isLoading) {
      const composed = composeWithAttachments();
      // Pass composed message directly to avoid race condition
      onSubmit(e, composed);
      onChange(''); // Clear input after
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
      const composed = composeWithAttachments();
      // Pass composed message directly to avoid race condition
      onSubmit(undefined, composed);
      onChange('');
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
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                      {att.name.split('.').pop()?.toUpperCase().slice(0, 4)}
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
            value={isVoiceRecording ? (message + (message && interimText ? ' ' : '') + interimText) : message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isVoiceRecording ? "Listening..." : "How can I help you?"}
            className={`pr-10 resize-none min-h-[44px] max-h-[120px] rounded-2xl py-3 px-4 !scrollbar-none bg-background/80 backdrop-blur-sm border-border/50 focus:bg-background/90 focus:border-border transition-all duration-200 shadow-sm hover:shadow-md ${isVoiceRecording ? 'text-muted-foreground' : ''}`}
            disabled={isLoading || isVoiceRecording}
            aria-label="Message input"
            rows={1}
            spellCheck="true"
          />
        </div>
        
        <InputButtons 
          message={message}
          isLoading={isLoading}
          hasAttachments={attachments.length > 0}
          onSendClick={() => {
            if ((message.trim() || attachments.length > 0) && !isLoading) {
              const composed = composeWithAttachments();
              // Pass composed message directly to avoid race condition
              onSubmit(undefined, composed);
              onChange('');
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
              }
              setAttachments([]);
            }
          }}
          onFileAttached={handleFileAttached}
          onVoiceTranscript={handleVoiceTranscript}
          onInterimTranscript={setInterimText}
          onRecordingStateChange={setIsVoiceRecording}
        />
      </div>
    </form>
  );
};
