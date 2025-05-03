
import { useRef } from 'react';
import { useGesture } from 'react-use-gesture';
import { useIsMobile } from './use-mobile';

type GestureActions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
};

export function useMessageGestures(actions: GestureActions = {}) {
  const isMobile = useIsMobile();
  const elementRef = useRef<HTMLDivElement>(null);
  const swipeState = useRef({ swiping: false, direction: null as 'left' | 'right' | null });
  
  // Configure gesture binding
  const bind = useGesture(
    {
      onDrag: ({ direction: [dirX], distance, dragging, cancel, event }) => {
        // Only handle horizontal swipes
        if (!isMobile || !elementRef.current) return;
        
        event?.preventDefault();
        const swipeDirection = dirX < 0 ? 'left' : 'right';
        const swipeThreshold = 80; // Minimum distance to trigger swipe action
        
        // Update visual feedback
        if (dragging && distance > 10) {
          swipeState.current = { swiping: true, direction: swipeDirection };
          
          // Apply transform during swipe
          const element = elementRef.current;
          const maxTranslate = 100;
          const translate = Math.min(distance, maxTranslate);
          const opacity = 0.25 + (0.75 * (1 - translate / maxTranslate));
          
          element.style.transform = `translateX(${swipeDirection === 'left' ? -translate : translate}px)`;
          element.style.opacity = `${opacity}`;
        }
        
        // Handle swipe completion
        if (!dragging && swipeState.current.swiping) {
          const element = elementRef.current;
          
          // Reset styles
          element.style.transform = 'translateX(0)';
          element.style.opacity = '1';
          
          // Execute action if threshold met
          if (distance >= swipeThreshold) {
            if (swipeDirection === 'left' && actions.onSwipeLeft) {
              actions.onSwipeLeft();
            } else if (swipeDirection === 'right' && actions.onSwipeRight) {
              actions.onSwipeRight();
            }
          }
          
          swipeState.current = { swiping: false, direction: null };
          cancel();
        }
      },
      // Handle long press with the onDrag handler's longPress option instead of a separate handler
    },
    {
      // Configure long press timing
      longPressDelay: 500,
      // Configure drag detection
      drag: {
        threshold: 5,
        filterTaps: true,
        rubberband: true,
      },
    }
  );

  // Create a separate handler for long press that can be registered as a regular event
  const handleLongPress = () => {
    if (actions.onLongPress) {
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      actions.onLongPress();
    }
  };

  return { 
    bind, 
    ref: elementRef,
    onLongPress: handleLongPress  // Expose long press handler separately
  };
}
