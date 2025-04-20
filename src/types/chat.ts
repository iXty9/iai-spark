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

export interface TokenInfo {
  threadId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface DebugInfo {
  viewportHeight: number;
  inputVisible: boolean;
  inputPosition: {
    top: number;
    left: number;
    bottom: number;
  };
  messageCount: number;
  isIOSSafari: boolean;
  computedStyles: {
    position: string;
    display: string;
    visibility: string;
    height: string;
    zIndex: string;
    overflow: string;
    transform: string;
    opacity: string;
  };
  parentInfo: {
    overflow: string;
    height: string;
    position: string;
  };
}
