import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  hasPermission: boolean;
}

// Convert spoken punctuation words to actual punctuation symbols
const convertSpokenPunctuation = (text: string): string => {
  const replacements: [RegExp, string][] = [
    // End punctuation
    [/\s*\bperiod\b/gi, '.'],
    [/\s*\bfull stop\b/gi, '.'],
    [/\s*\bcomma\b/gi, ','],
    [/\s*\bquestion mark\b/gi, '?'],
    [/\s*\bexclamation point\b/gi, '!'],
    [/\s*\bexclamation mark\b/gi, '!'],
    
    // Other punctuation
    [/\s*\bcolon\b/gi, ':'],
    [/\s*\bsemicolon\b/gi, ';'],
    [/\s*\bhyphen\b/gi, '-'],
    [/\s*\bdash\b/gi, '—'],
    [/\s*\bellipsis\b/gi, '...'],
    
    // Quotes and brackets
    [/\bopen quote\b/gi, '"'],
    [/\bclose quote\b/gi, '"'],
    [/\bquote\b/gi, '"'],
    [/\bopen paren\b/gi, '('],
    [/\bclose paren\b/gi, ')'],
    
    // Line breaks
    [/\bnew line\b/gi, '\n'],
    [/\bnew paragraph\b/gi, '\n\n'],
  ];
  
  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
};

export const useVoiceInput = () => {
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    hasPermission: false
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  // Check for speech recognition support and set up handlers
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition || !!navigator.mediaDevices?.getUserMedia;
    
    setVoiceState(prev => ({ ...prev, isSupported }));
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        logger.info('Speech recognition started');
        accumulatedTranscriptRef.current = '';
        setVoiceState(prev => ({ 
          ...prev, 
          isRecording: true, 
          error: null,
          transcript: '',
          interimTranscript: ''
        }));
      };
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let currentInterimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcriptText;
          } else {
            currentInterimTranscript += transcriptText;
          }
        }
        
        // Accumulate final results
        if (finalTranscript) {
          accumulatedTranscriptRef.current = finalTranscript;
        }
        
        // Show accumulated text + current interim for continuous display
        // Apply punctuation conversion for real-time preview
        const displayText = convertSpokenPunctuation(
          accumulatedTranscriptRef.current + currentInterimTranscript
        );
        
        setVoiceState(prev => ({ 
          ...prev, 
          interimTranscript: displayText
        }));
      };
      
      recognitionRef.current.onend = () => {
        logger.info('Speech recognition ended');
        // Apply punctuation conversion to final transcript
        const rawText = accumulatedTranscriptRef.current.trim();
        const finalText = convertSpokenPunctuation(rawText);
        setVoiceState(prev => ({ 
          ...prev, 
          isRecording: false,
          interimTranscript: '',
          transcript: finalText
        }));
      };
      
      recognitionRef.current.onerror = (event) => {
        // Ignore 'no-speech' and 'aborted' errors - they're not real errors
        if (event.error === 'no-speech' || event.error === 'aborted') {
          logger.info('Speech recognition ended without speech', event.error);
          return;
        }
        
        logger.error('Speech recognition error', event.error);
        setVoiceState(prev => ({ 
          ...prev, 
          isRecording: false, 
          error: `Speech recognition error: ${event.error}` 
        }));
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore stop errors
        }
        mediaRecorderRef.current = null;
      }
    };
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
      accumulatedTranscriptRef.current = '';
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
        // Apply punctuation conversion to Whisper results too
        const finalText = convertSpokenPunctuation(data.text);
        setVoiceState(prev => ({ 
          ...prev, 
          transcript: finalText,
          isProcessing: false 
        }));
        logger.info('Voice transcription completed', { transcript: finalText });
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
    // Clear previous transcript when starting new recording
    setVoiceState(prev => ({ 
      ...prev, 
      transcript: '', 
      interimTranscript: '',
      error: null 
    }));
    accumulatedTranscriptRef.current = '';
    
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
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
    }
    
    if (mediaRecorderRef.current && voiceState.isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      mediaRecorderRef.current = null;
    }
    
    logger.info('Voice recording stopped');
  }, [voiceState.isRecording]);

  const clearTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setVoiceState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
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
