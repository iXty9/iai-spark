
/**
 * Centralized DOM management service
 * Provides safe, type-checked access to DOM operations with proper cleanup
 */

import { logger } from '@/utils/logging';

export interface DOMElementInfo {
  exists: boolean;
  rect?: DOMRect;
  computedStyle?: CSSStyleDeclaration;
  isVisible?: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation?: string;
}

class DOMManagerService {
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private resizeCallbacks = new Set<(info: ViewportInfo) => void>();
  private mutationCallbacks = new Set<(mutations: MutationRecord[]) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Initialize ResizeObserver for viewport changes
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        const info = this.getViewportInfo();
        this.resizeCallbacks.forEach(callback => {
          try {
            callback(info);
          } catch (error) {
            logger.warn('Error in resize callback', error, { module: 'dom-manager' });
          }
        });
      });
      this.resizeObserver.observe(document.documentElement);
    }
  }

  getViewportInfo(): ViewportInfo {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0, devicePixelRatio: 1 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: (screen as any).orientation?.type || 'unknown'
    };
  }

  getElementInfo(selector: string): DOMElementInfo {
    if (typeof document === 'undefined') {
      return { exists: false };
    }

    const element = document.querySelector(selector);
    if (!element) {
      return { exists: false };
    }

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const isVisible = rect.width > 0 && rect.height > 0 && 
                     computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden';

    return {
      exists: true,
      rect,
      computedStyle,
      isVisible
    };
  }

  getElementById(id: string): HTMLElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById(id);
  }

  scrollElementIntoView(selector: string, options?: ScrollIntoViewOptions): boolean {
    const element = document.querySelector(selector);
    if (element && 'scrollIntoView' in element) {
      element.scrollIntoView(options);
      return true;
    }
    return false;
  }

  addResizeListener(callback: (info: ViewportInfo) => void): () => void {
    this.resizeCallbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.resizeCallbacks.delete(callback);
    };
  }

  addMutationListener(
    target: Element,
    callback: (mutations: MutationRecord[]) => void,
    options?: MutationObserverInit
  ): () => void {
    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.mutationCallbacks.forEach(cb => {
          try {
            cb(mutations);
          } catch (error) {
            logger.warn('Error in mutation callback', error, { module: 'dom-manager' });
          }
        });
      });
    }

    this.mutationCallbacks.add(callback);
    this.mutationObserver.observe(target, options || { childList: true, subtree: true });

    return () => {
      this.mutationCallbacks.delete(callback);
      if (this.mutationCallbacks.size === 0 && this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
    };
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeCallbacks.clear();
    this.mutationCallbacks.clear();
  }
}

export const domManagerService = new DOMManagerService();
