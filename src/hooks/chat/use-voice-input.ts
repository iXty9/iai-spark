
import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  transcript: string;
  isSupported: boolean;
  hasPermission: boolean;
}

export const useVoiceInput = () => {
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: '',
    isSupported: false,
    hasPermission: false
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition || !!navigator.mediaDevices?.getUserMedia;
    
    setVoiceState(prev => ({ ...prev, isSupported }));
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        logger.info('Speech recognition started');
        setVoiceState(prev => ({ ...prev, isRecording: true, error: null }));
      };
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        setVoiceState(prev => ({ ...prev, transcript }));
      };
      
      recognitionRef.current.onend = () => {
        logger.info('Speech recognition ended');
        setVoiceState(prev => ({ ...prev, isRecording: false }));
      };
      
      recognitionRef.current.onerror = (event) => {
        logger.error('Speech recognition error', event.error);
        setVoiceState(prev => ({ 
          ...prev, 
          isRecording: false, 
          error: `Speech recognition error: ${event.error}` 
        }));
      };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setVoiceState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch (error) {
      logger.error('Microphone permission denied', error);
      setVoiceState(prev => ({ 
        ...prev, 
        hasPermission: false,
        error: 'Microphone permission is required for voice input' 
      }));
      return false;
    }
  }, []);

  const startWebSpeechRecognition = useCallback(async () => {
    if (!recognitionRef.current) return false;
    
    try {
      recognitionRef.current.start();
      return true;
    } catch (error) {
      logger.error('Failed to start Web Speech API', error);
      return false;
    }
  }, []);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudioWithWhisper(audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setVoiceState(prev => ({ ...prev, isRecording: true, error: null }));
      logger.info('Audio recording started');
      return true;
    } catch (error) {
      logger.error('Failed to start audio recording', error);
      setVoiceState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
      return false;
    }
  }, []);

  const processAudioWithWhisper = async (audioBlob: Blob) => {
    setVoiceState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (error) throw error;
      
      if (data?.text) {
        setVoiceState(prev => ({ 
          ...prev, 
          transcript: data.text,
          isProcessing: false 
        }));
        logger.info('Voice transcription completed', { transcript: data.text });
      } else {
        throw new Error('No transcription received');
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

  const startRecording = useCallback(async () => {
    if (!voiceState.hasPermission) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
    }

    // Try Web Speech API first (better for real-time)
    if (recognitionRef.current) {
      const success = await startWebSpeechRecognition();
      if (success) return;
    }
    
    // Fallback to audio recording + Whisper
    await startAudioRecording();
  }, [voiceState.hasPermission, requestPermission, startWebSpeechRecognition, startAudioRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && voiceState.isRecording) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    setVoiceState(prev => ({ ...prev, isRecording: false }));
    logger.info('Voice recording stopped');
  }, [voiceState.isRecording]);

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
    clearError,
    requestPermission
  };
};
