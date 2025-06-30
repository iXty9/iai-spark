
import { useState, useEffect, useCallback } from 'react';
import { DebugInfo } from '@/types/chat';
import { logger } from '@/utils/logging';

const INITIAL_DEBUGINFO: DebugInfo = {
  viewportHeight: 0,
  inputVisible: true,
  inputPosition: { top: 0, left: 0, bottom: 0 },
  messageCount: 0,
  isIOSSafari: false,
  computedStyles: {
    position: '',
    display: '',
    visibility: '',
    height: '',
    zIndex: '',
    overflow: '',
    transform: '',
    opacity: ''
  },
  parentInfo: {
    overflow: '',
    height: '',
    position: ''
  }
};

export const useDebugInfo = (isDevMode: boolean, messages: any[]) => {
  const [debugInfo, setDebugInfo] = useState(INITIAL_DEBUGINFO);

  // Viewport and Safari detection
  useEffect(() => {
    if (!isDevMode) return;
    
    setDebugInfo(di => ({
      ...di,
      isIOSSafari: /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window) &&
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      viewportHeight: window.innerHeight
    }));
  }, [isDevMode]);

  // Stabilize updateDebugInfo with useCallback to prevent infinite re-renders
  const updateDebugInfo = useCallback((inputContainerRef: React.RefObject<HTMLDivElement>) => {
    if (!isDevMode) return;

    setDebugInfo(di => {
      let update = { ...di, messageCount: messages.length };
      const ref = inputContainerRef.current;
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const cs = window.getComputedStyle(ref);
        const parentStyle = ref.parentElement ? window.getComputedStyle(ref.parentElement) : undefined;
        update = {
          ...update,
          inputVisible: cs.display !== 'none' && cs.visibility !== 'hidden',
          inputPosition: { top: rect.top, left: rect.left, bottom: rect.bottom },
          computedStyles: {
            position: cs.position, display: cs.display, visibility: cs.visibility,
            height: cs.height, zIndex: cs.zIndex, overflow: cs.overflow,
            transform: cs.transform, opacity: cs.opacity
          },
          parentInfo: parentStyle ? {
            overflow: parentStyle.overflow, height: parentStyle.height, position: parentStyle.position
          } : di.parentInfo
        };
      }
      return update;
    });
  }, [isDevMode, messages.length]); // Only depend on stable values

  return { debugInfo, updateDebugInfo };
};
