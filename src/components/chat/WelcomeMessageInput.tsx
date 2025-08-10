import React, { useRef, FormEvent, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Mic, MicOff, Loader2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { useFileUpload } from '@/hooks/chat/use-file-upload';
import { useVoiceInput } from '@/hooks/chat/use-voice-input';
import { useToast } from '@/hooks/use-toast';
import { VersionBadge } from './VersionBadge';
import { ParsedAttachment, isImageMime, toDataUrl } from '@/utils/attachment-utils';

interface WelcomeMessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const WelcomeMessageInput: React.FC<WelcomeMessageInputProps> = ({ 
  message, 
  onChange, 
  onSubmit, 
  isLoading,
  disabled = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { uploadState, uploadFile, clearError } = useFileUpload();
  const { 
    voiceState, 
    startRecording, 
    stopRecording, 
    clearError: clearVoiceError,
    clearTranscript,
    requestPermission
  } = useVoiceInput();

  useTextareaResize(textareaRef, message);

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

    if ((message.trim() || attachments.length > 0) && !isLoading && !disabled) {
      const composed = composeWithAttachments();
      onChange(composed);
      onSubmit(e);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior for Shift+Enter
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && (message.trim() || attachments.length > 0) && !isLoading && !disabled) {
      e.preventDefault();
      const blocks = attachments
        .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
        .join('');
      const composed = attachments.length > 0 ? (message ? `${message}\n${blocks}` : blocks) : message;
      onChange(composed);
      onSubmit();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setAttachments([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // File upload handlers
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result) {
      // result is a data URL. Extract and store locally, don't show in input
      const match = /^data:([^;]+);base64,(.*)$/s.exec(result || '');
      const mime = match ? match[1] : 'application/octet-stream';
      const data = match ? match[2] : result;
      setAttachments(prev => [...prev, { name: file.name, mime, data }]);
      toast({
        title: "File attached",
        description: `${file.name} has been attached to your message.`
      });
    } else if (uploadState.error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: uploadState.error
      });
      clearError();
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Voice input handlers
  const handleVoiceClick = async () => {
    if (!voiceState.isSupported) {
      toast({
        variant: "destructive",
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input."
      });
      return;
    }

    if (voiceState.isRecording) {
      stopRecording();
    } else {
      if (!voiceState.hasPermission) {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          toast({
            variant: "destructive",
            title: "Microphone access required",
            description: "Please allow microphone access to use voice input."
          });
          return;
        }
      }
      
      clearTranscript();
      await startRecording();
      
      if (voiceState.error) {
        toast({
          variant: "destructive",
          title: "Voice input failed",
          description: voiceState.error
        });
        clearVoiceError();
      }
    }
  };

  // Handle voice transcript
  React.useEffect(() => {
    if (voiceState.transcript) {
      const newMessage = message ? `${message} ${voiceState.transcript}` : voiceState.transcript;
      onChange(newMessage);
      clearTranscript();
      
      toast({
        title: "Voice input complete",
        description: "Your speech has been transcribed."
      });
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [voiceState.transcript, message, onChange, clearTranscript, toast]);

  // Handle voice errors
  React.useEffect(() => {
    if (voiceState.error) {
      toast({
        variant: "destructive",
        title: "Voice input error",
        description: voiceState.error
      });
    }
  }, [voiceState.error, toast]);

  const getVoiceButtonState = () => {
    if (voiceState.isProcessing) {
      return { icon: Loader2, className: "animate-spin", disabled: true };
    }
    if (voiceState.isRecording) {
      return { icon: MicOff, className: "text-red-500", disabled: false };
    }
    return { icon: Mic, className: "", disabled: !voiceState.isSupported };
  };

  const voiceButtonState = getVoiceButtonState();
  const VoiceIcon = voiceButtonState.icon;

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,text/*,.pdf,.json"
        />
        
        <div className="relative backdrop-blur-sm bg-background/80 border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 focus-within:bg-background/90 focus-within:border-border">
          <div className="flex items-end gap-2 p-3">
            {/* File Upload Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 h-10 w-10 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Upload file"
                  onClick={handleFileClick}
                  disabled={uploadState.isUploading || disabled}
                >
                  {uploadState.isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Attach file</p>
              </TooltipContent>
            </Tooltip>

            {/* Text Input */}
            <div className="flex-1 relative">
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
                placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
                className="resize-none min-h-[44px] max-h-[120px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 !scrollbar-none"
                disabled={isLoading || disabled}
                aria-label="Message input"
                rows={1}
                spellCheck="true"
              />
            </div>

            {/* Voice Input Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 h-10 w-10 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label={
                    voiceState.isRecording 
                      ? "Stop recording" 
                      : voiceState.isProcessing 
                      ? "Processing..." 
                      : "Start voice input"
                  }
                  onClick={handleVoiceClick}
                  disabled={voiceButtonState.disabled || disabled}
                >
                  <VoiceIcon className={`h-4 w-4 ${voiceButtonState.className}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {voiceState.isRecording 
                    ? "Stop recording" 
                    : voiceState.isProcessing 
                    ? "Processing..." 
                    : "Voice input"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Send Button */}
            <Button 
              type="button" 
              variant="default" 
              size="icon" 
              disabled={!(message.trim() || attachments.length > 0) || isLoading || disabled}
              aria-label="Send message"
              className="rounded-full shrink-0 h-10 w-10 bg-[#ea384c] hover:bg-[#dd3333] transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-[#ea384c]/20 disabled:opacity-50 disabled:hover:scale-100"
              onClick={() => {
                if ((message.trim() || attachments.length > 0) && !isLoading && !disabled) {
                  const blocks = attachments
                    .map(att => `\n[attachment name="${att.name}" mime="${att.mime}"]\ndata:${att.mime};base64,${att.data}\n[/attachment]\n`)
                    .join('');
                  const composed = attachments.length > 0 ? (message ? `${message}\n${blocks}` : blocks) : message;
                  onChange(composed);
                  onSubmit();
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                  }
                  setAttachments([]);
                }
              }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isMobile ? (
                <Send className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Version Badge - centered below input */}
        <div className="flex justify-center mt-2">
          <VersionBadge />
        </div>
      </form>
    </TooltipProvider>
  );
};