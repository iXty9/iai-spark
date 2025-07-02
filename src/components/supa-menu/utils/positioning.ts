import { MenuPosition } from '@/services/supa-menu/types';

export const calculateMenuPosition = (
  triggerElement: HTMLElement,
  position: MenuPosition
): { top: number; left: number } => {
  const triggerRect = triggerElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let top = 0;
  let left = 0;

  // If centered is enabled, always center horizontally relative to viewport
  if (position.centered) {
    left = viewportWidth / 2;
    
    // Calculate vertical position relative to trigger
    switch (position.side) {
      case 'top':
        top = triggerRect.top - 8; // Small gap above trigger
        break;
      case 'bottom':
      default:
        top = triggerRect.bottom + 8; // Small gap below trigger
        break;
    }
    
    // For centered mode, ensure the menu doesn't go off-screen vertically
    const menuHeight = 200; // Approximate menu height
    if (top + menuHeight > viewportHeight) {
      top = Math.max(16, viewportHeight - menuHeight - 16);
    }
    if (top < 16) {
      top = 16;
    }
    
    return { top, left };
  } else {
    // Traditional positioning relative to trigger
    switch (position.side) {
      case 'top':
        top = triggerRect.top - 8;
        break;
      case 'bottom':
      default:
        top = triggerRect.bottom + 8;
        break;
      case 'left':
        left = triggerRect.left - 8;
        top = triggerRect.top;
        break;
      case 'right':
        left = triggerRect.right + 8;
        top = triggerRect.top;
        break;
    }

    // Handle horizontal alignment for top/bottom positioning
    if (position.side === 'top' || position.side === 'bottom') {
      switch (position.align) {
        case 'start':
          left = triggerRect.left;
          break;
        case 'center':
          left = triggerRect.left + triggerRect.width / 2;
          break;
        case 'end':
          left = triggerRect.right;
          break;
      }
    }

    // Handle vertical alignment for left/right positioning
    if (position.side === 'left' || position.side === 'right') {
      switch (position.align) {
        case 'start':
          top = triggerRect.top;
          break;
        case 'center':
          top = triggerRect.top + triggerRect.height / 2;
          break;
        case 'end':
          top = triggerRect.bottom;
          break;
      }
    }
  }

  // Ensure menu stays within viewport bounds
  const menuWidth = 180; // Approximate menu width
  const menuHeight = 200; // Approximate menu height

  // Adjust horizontal position if menu would overflow
  if (left + menuWidth > viewportWidth) {
    left = viewportWidth - menuWidth - 16; // 16px margin
  }
  if (left < 16) {
    left = 16; // 16px margin
  }

  // Adjust vertical position if menu would overflow
  if (top + menuHeight > viewportHeight) {
    top = viewportHeight - menuHeight - 16; // 16px margin
  }
  if (top < 16) {
    top = 16; // 16px margin
  }

  return { top, left };
};