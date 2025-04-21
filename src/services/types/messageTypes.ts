
import { Message } from '@/types/chat';

export type SendMessageParams = {
  message: string;
  onMessageStart?: (message: Message) => void;
  onMessageStream?: (chunk: string) => void;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
  isAuthenticated?: boolean;
};

export type MessageResponse = {
  output?: string;
  text?: string;
  threadId?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

