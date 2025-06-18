
/**
 * Centralized timer management service
 * Manages timeouts, intervals, and animation frames with proper cleanup
 */

import { logger } from '@/utils/logging';

interface TimerEntry {
  id: number;
  type: 'timeout' | 'interval' | 'animation';
  callback: () => void;
  delay?: number;
  created: number;
}

class TimerManagerService {
  private timers = new Map<string, TimerEntry>();

  /**
   * Create a managed timeout
   */
  setTimeout(callback: () => void, delay: number): string {
    const managerId = this.generateId();
    const wrappedCallback = () => {
      try {
        callback();
      } catch (error) {
        logger.warn('Error in timeout callback', error, { module: 'timer-manager' });
      } finally {
        // Auto-cleanup completed timeouts
        this.timers.delete(managerId);
      }
    };

    const id = window.setTimeout(wrappedCallback, delay);
    
    this.timers.set(managerId, {
      id,
      type: 'timeout',
      callback,
      delay,
      created: Date.now()
    });

    return managerId;
  }

  /**
   * Create a managed interval
   */
  setInterval(callback: () => void, delay: number): string {
    const managerId = this.generateId();
    const wrappedCallback = () => {
      try {
        callback();
      } catch (error) {
        logger.warn('Error in interval callback', error, { module: 'timer-manager' });
      }
    };

    const id = window.setInterval(wrappedCallback, delay);
    
    this.timers.set(managerId, {
      id,
      type: 'interval',
      callback,
      delay,
      created: Date.now()
    });

    return managerId;
  }

  /**
   * Create a managed animation frame request
   */
  requestAnimationFrame(callback: () => void): string {
    const managerId = this.generateId();
    const wrappedCallback = () => {
      try {
        callback();
      } catch (error) {
        logger.warn('Error in animation frame callback', error, { module: 'timer-manager' });
      } finally {
        // Auto-cleanup completed animation frames
        this.timers.delete(managerId);
      }
    };

    const id = requestAnimationFrame(wrappedCallback);
    
    this.timers.set(managerId, {
      id,
      type: 'animation',
      callback,
      created: Date.now()
    });

    return managerId;
  }

  /**
   * Clear a specific timer
   */
  clearTimer(managerId: string): boolean {
    const timer = this.timers.get(managerId);
    if (!timer) {
      return false;
    }

    switch (timer.type) {
      case 'timeout':
        clearTimeout(timer.id);
        break;
      case 'interval':
        clearInterval(timer.id);
        break;
      case 'animation':
        cancelAnimationFrame(timer.id);
        break;
    }

    this.timers.delete(managerId);
    return true;
  }

  /**
   * Clear all timers (cleanup)
   */
  clearAllTimers(): void {
    this.timers.forEach((timer, managerId) => {
      switch (timer.type) {
        case 'timeout':
          clearTimeout(timer.id);
          break;
        case 'interval':
          clearInterval(timer.id);
          break;
        case 'animation':
          cancelAnimationFrame(timer.id);
          break;
      }
    });

    this.timers.clear();
    logger.info('All timers cleared', null, { module: 'timer-manager' });
  }

  /**
   * Get active timer count (for debugging)
   */
  getTimerCount(): { total: number; timeouts: number; intervals: number; animations: number } {
    let timeouts = 0, intervals = 0, animations = 0;
    
    this.timers.forEach(timer => {
      switch (timer.type) {
        case 'timeout': timeouts++; break;
        case 'interval': intervals++; break;
        case 'animation': animations++; break;
      }
    });

    return {
      total: this.timers.size,
      timeouts,
      intervals,
      animations
    };
  }

  /**
   * Get timer info for debugging
   */
  getTimerInfo(managerId: string): TimerEntry | undefined {
    return this.timers.get(managerId);
  }

  private generateId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy() {
    this.clearAllTimers();
  }
}

export const timerManagerService = new TimerManagerService();
