
/**
 * Tab visibility tracker
 * Provides a centralized way to track tab visibility
 */

import { eventBus, AppEvents } from './event-bus';

class VisibilityTracker {
  private isVisible: boolean;
  private initialized: boolean = false;
  
  constructor() {
    // Default to visible (safer assumption)
    this.isVisible = true;
    
    // Initialize on first use
    this.init();
  }
  
  /**
   * Initialize visibility tracking
   */
  private init(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    if (typeof document !== 'undefined') {
      // Set initial value
      this.isVisible = document.visibilityState === 'visible';
      
      // Set up event listener
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Publish initial state
      eventBus.publish(
        this.isVisible ? AppEvents.TAB_VISIBLE : AppEvents.TAB_HIDDEN, 
        { timestamp: new Date().toISOString() }
      );
    }
  }
  
  /**
   * Handle visibility change event
   */
  private handleVisibilityChange = (): void => {
    const wasVisible = this.isVisible;
    this.isVisible = document.visibilityState === 'visible';
    
    // Only publish if state actually changed
    if (wasVisible !== this.isVisible) {
      eventBus.publish(
        this.isVisible ? AppEvents.TAB_VISIBLE : AppEvents.TAB_HIDDEN, 
        { timestamp: new Date().toISOString() }
      );
    }
  };
  
  /**
   * Check if tab is visible
   * @returns True if tab is visible
   */
  isTabVisible(): boolean {
    // Make sure we're initialized
    if (!this.initialized) this.init();
    return this.isVisible;
  }
  
  /**
   * Release resources - should be called when app unmounts
   */
  cleanup(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const visibilityTracker = new VisibilityTracker();

// Helper function to check visibility
export function isTabVisible(): boolean {
  return visibilityTracker.isTabVisible();
}

// Helper hook for React components
export function useTabVisibility(): boolean {
  const [isVisible, setIsVisible] = React.useState(visibilityTracker.isTabVisible());
  
  React.useEffect(() => {
    const visibleSub = eventBus.subscribe(AppEvents.TAB_VISIBLE, () => setIsVisible(true));
    const hiddenSub = eventBus.subscribe(AppEvents.TAB_HIDDEN, () => setIsVisible(false));
    
    return () => {
      visibleSub.unsubscribe();
      hiddenSub.unsubscribe();
    };
  }, []);
  
  return isVisible;
}

// Make sure to initialize and cleanup on app lifecycle
eventBus.subscribe(AppEvents.APP_MOUNTED, () => visibilityTracker.isTabVisible());
eventBus.subscribe(AppEvents.APP_UNMOUNTED, () => visibilityTracker.cleanup());
