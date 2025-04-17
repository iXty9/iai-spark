
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  pending?: boolean;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  error?: string | null;
}
