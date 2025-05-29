
import { Message } from '@/types/chat';

export interface SendMessageParams {
  message: string;
  onMessageStart?: (message: Message) => void;
  onMessageStream?: (content: string) => void;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
  isAuthenticated?: boolean;
  userProfile?: { username?: string; first_name?: string; last_name?: string } | null;
}
