
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFileUpload } from '@/hooks/chat/use-file-upload';
import { useVoiceInput } from '@/hooks/chat/use-voice-input';
import { useToast } from '@/hooks/use-toast';

interface InputButtonsProps {
  message: string;
  isLoading: boolean;
  hasAttachments?: boolean;
  onSendClick: () => void;
  onFileAttached?: (content: string, fileName: string) => void;
  onVoiceTranscript?: (transcript: string) => void;
  onInterimTranscript?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export const InputButtons: React.FC<InputButtonsProps> = ({
  message,
  isLoading,
  hasAttachments = false,
  onSendClick,
  onFileAttached,
  onVoiceTranscript,
  onInterimTranscript,
  onRecordingStateChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result && onFileAttached) {
      onFileAttached(result, file.name);
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

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const lastErrorRef = React.useRef<string | null>(null);

  // Handle voice transcript when it's available - no toast needed
  React.useEffect(() => {
    if (voiceState.transcript && onVoiceTranscript) {
      onVoiceTranscript(voiceState.transcript);
      clearTranscript();
    }
  }, [voiceState.transcript, onVoiceTranscript, clearTranscript]);

  // Pass interim transcript to parent for real-time display
  React.useEffect(() => {
    if (onInterimTranscript) {
      onInterimTranscript(voiceState.interimTranscript || '');
    }
  }, [voiceState.interimTranscript, onInterimTranscript]);

  // Notify parent of recording state changes
  React.useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(voiceState.isRecording);
    }
  }, [voiceState.isRecording, onRecordingStateChange]);

  // Handle voice errors - prevent duplicate toasts
  React.useEffect(() => {
    if (voiceState.error && voiceState.error !== lastErrorRef.current) {
      lastErrorRef.current = voiceState.error;
      toast({
        variant: "destructive",
        title: "Voice input error",
        description: voiceState.error
      });
    } else if (!voiceState.error) {
      lastErrorRef.current = null;
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,text/*,.pdf,.json"
      />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="shrink-0 h-11 w-11 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Upload file"
            onClick={handleFileClick}
            disabled={uploadState.isUploading}
          >
            {uploadState.isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Attach file</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="shrink-0 h-11 w-11 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label={
              voiceState.isRecording 
                ? "Stop recording" 
                : voiceState.isProcessing 
                ? "Processing..." 
                : "Start voice input"
            }
            onClick={handleVoiceClick}
            disabled={voiceButtonState.disabled}
            title={
              !voiceState.isSupported 
                ? "Voice input not supported in this browser" 
                : undefined
            }
          >
            <VoiceIcon className={`h-5 w-5 ${voiceButtonState.className}`} />
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
      
      <Button 
        type="button" 
        variant="default" 
        size="icon" 
        disabled={(!message.trim() && !hasAttachments) || isLoading}
        aria-label="Send message"
        className="rounded-full shrink-0 h-11 w-11 transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:hover:scale-100"
        onClick={onSendClick}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </TooltipProvider>
  );
};
