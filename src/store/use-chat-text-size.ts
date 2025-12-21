import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatTextSize = 'small' | 'medium' | 'large';

interface ChatTextSizeState {
  textSize: ChatTextSize;
  setTextSize: (size: ChatTextSize) => void;
}

export const useChatTextSize = create<ChatTextSizeState>()(
  persist(
    (set) => ({
      textSize: 'large', // Default to current size
      setTextSize: (size) => set({ textSize: size }),
    }),
    {
      name: 'chat_text_size',
    }
  )
);
