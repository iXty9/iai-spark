
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/chat/use-file-upload';
import { useVoiceInput } from '@/hooks/chat/use-voice-input';
import { useToast } from '@/hooks/use-toast';

interface InputButtonsProps {
  message: string;
  isLoading: boolean;
  onSendClick: () => void;
  onFileAttached?: (content: string, fileName: string) => void;
  onVoiceTranscript?: (transcript: string) => void;
}

export const InputButtons: React.FC<InputButtonsProps> = ({
  message,
  isLoading,
  onSendClick,
  onFileAttached,
  onVoiceTranscript
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { uploadState, uploadFile, clearError } = useFileUpload();
  const { voiceState, startRecording, stopRecording, clearError: clearVoiceError } = useVoiceInput();

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
    if (voiceState.isRecording) {
      stopRecording();
    } else {
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
    if (voiceState.transcript && onVoiceTranscript) {
      onVoiceTranscript(voiceState.transcript);
      toast({
        title: "Voice input complete",
        description: "Your speech has been transcribed."
      });
    }
  }, [voiceState.transcript, onVoiceTranscript, toast]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,text/*,.pdf,.json"
      />
      
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        className="shrink-0"
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
      
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        className="shrink-0"
        aria-label={voiceState.isRecording ? "Stop recording" : "Start voice input"}
        onClick={handleVoiceClick}
        disabled={voiceState.isProcessing}
      >
        {voiceState.isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : voiceState.isRecording ? (
          <MicOff className="h-5 w-5 text-red-500" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      
      <Button 
        type="button" 
        variant="default" 
        size="icon" 
        disabled={!message.trim() || isLoading}
        aria-label="Send message"
        className="rounded-full shrink-0"
        onClick={onSendClick}
      >
        <Send className="h-5 w-5" />
      </Button>
    </>
  );
};
