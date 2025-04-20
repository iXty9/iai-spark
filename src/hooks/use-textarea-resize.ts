
import { useEffect, RefObject } from 'react';

export const useTextareaResize = (
  textareaRef: RefObject<HTMLTextAreaElement>,
  value: string
) => {
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);
};
