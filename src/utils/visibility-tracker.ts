
import { logger } from '@/utils/logging';

// Track tab visibility for optimizations
let isTabVisibleState = true;

// Initialize the visibility tracker
function initVisibilityTracker() {
  if (typeof document !== 'undefined') {
    // Set the initial state
    isTabVisibleState = document.visibilityState === 'visible';
    
    // Add event listener to track visibility changes
    document.addEventListener('visibilitychange', () => {
      const wasVisible = isTabVisibleState;
      isTabVisibleState = document.visibilityState === 'visible';
      
      // Only log if the state actually changed
      if (wasVisible !== isTabVisibleState) {
        logger.debug('Tab visibility changed', { isVisible: isTabVisibleState }, { module: 'visibility-tracker' });
      }
    });
    
    logger.info('Visibility tracker initialized', { module: 'visibility-tracker' });
  }
}

// Initialize visibility tracking on module import
initVisibilityTracker();

/**
 * Check if the current tab is visible
 * @returns true if tab is visible, false otherwise
 */
export function isTabVisible(): boolean {
  return isTabVisibleState;
}

/**
 * Wait until the tab becomes visible
 * @param maxWaitMs Maximum time to wait in milliseconds (default: 30000)
 * @returns Promise that resolves when tab becomes visible or times out
 */
export function waitUntilVisible(maxWaitMs: number = 30000): Promise<boolean> {
  // If already visible, resolve immediately
  if (isTabVisibleState) return Promise.resolve(true);
  
  return new Promise<boolean>((resolve) => {
    // Set timeout to resolve after maxWaitMs
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, maxWaitMs);
    
    // Create visibility change handler
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
        resolve(true);
      }
    };
    
    // Add event listener
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Cleanup function to remove listener and clear timeout
    function cleanup() {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
  });
}

export default {
  isTabVisible,
  waitUntilVisible
};
