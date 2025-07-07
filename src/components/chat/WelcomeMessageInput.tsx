import React, { useRef, FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Mic, MicOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { useFileUpload } from '@/hooks/chat/use-file-upload';
import { useVoiceInput } from '@/hooks/chat/use-voice-input';
import { supaToast } from '@/services/supa-toast';
import { VersionBadge } from './VersionBadge';

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
  // Using unified SupaToast system
  
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSubmit(e);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior for Shift+Enter
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && message.trim() && !isLoading && !disabled) {
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

  // File upload handlers
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result) {
      const fileInfo = `[Attached file: ${file.name}]\n\n`;
      onChange(fileInfo + message);
      supaToast.success(`${file.name} has been attached to your message.`, {
        title: "File attached"
      });
    } else if (uploadState.error) {
      supaToast.error(uploadState.error, {
        title: "Upload failed"
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
      supaToast.error("Your browser doesn't support voice input.", {
        title: "Voice input not supported"
      });
      return;
    }

    if (voiceState.isRecording) {
      stopRecording();
    } else {
      if (!voiceState.hasPermission) {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          supaToast.error("Please allow microphone access to use voice input.", {
            title: "Microphone access required"
          });
          return;
        }
      }
      
      clearTranscript();
      await startRecording();
      
      if (voiceState.error) {
        supaToast.error(voiceState.error, {
          title: "Voice input failed"
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
      
      supaToast.success("Your speech has been transcribed.", {
        title: "Voice input complete"
      });
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [voiceState.transcript, message, onChange, clearTranscript]);

  // Handle voice errors
  React.useEffect(() => {
    if (voiceState.error) {
      supaToast.error(voiceState.error, {
        title: "Voice input error"
      });
    }
  }, [voiceState.error]);

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
              disabled={!message.trim() || isLoading || disabled}
              aria-label="Send message"
              className="rounded-full shrink-0 h-10 w-10 bg-[#ea384c] hover:bg-[#dd3333] transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-[#ea384c]/20 disabled:opacity-50 disabled:hover:scale-100"
              onClick={() => {
                if (message.trim() && !isLoading && !disabled) {
                  onSubmit();
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                  }
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