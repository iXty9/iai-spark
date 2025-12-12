
import { Message } from '@/types/chat';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface RecallContext {
  enabled: boolean;
  selected_datetime: string | null;
}

export interface SendMessageParams {
  message: string;
  onMessageStart?: (message: Message) => void;
  onMessageStream?: (content: string) => void;
  onMessageComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
  isAuthenticated?: boolean;
  userProfile?: { id?: string; username?: string; first_name?: string; last_name?: string } | null;
  location?: UserLocation | null;
  recall?: RecallContext | null;
}
