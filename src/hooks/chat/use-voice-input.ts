
import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logging';

export interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  transcript: string;
}

export const useVoiceInput = () => {
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: ''
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Check if browser supports speech recognition
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Voice input not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }));

      logger.info('Voice recording started');
    } catch (error) {
      logger.error('Failed to start voice recording', error);
      setVoiceState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop();
      setVoiceState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: true
      }));
      logger.info('Voice recording stopped');
    }
  }, [voiceState.isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      // For now, we'll use the Web Speech API if available
      // In the future, this could send audio to a speech-to-text service
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // This is a fallback - the actual transcription would happen during recording
        // with continuous recognition, but for demo purposes, we'll simulate it
        setVoiceState(prev => ({
          ...prev,
          isProcessing: false,
          transcript: 'Voice input processed (demo mode)'
        }));
      } else {
        throw new Error('Speech recognition not available');
      }
    } catch (error) {
      logger.error('Audio processing failed', error);
      setVoiceState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Failed to process audio'
      }));
    }
  };

  const clearTranscript = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      transcript: '',
      error: null
    }));
  }, []);

  const clearError = useCallback(() => {
    setVoiceState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    voiceState,
    startRecording,
    stopRecording,
    clearTranscript,
    clearError
  };
};
