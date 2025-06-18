
/**
 * Service for managing global debug state
 * Provides safe access to window-level debug information
 */

import { logger } from '@/utils/logging';
import { DebugState } from '@/types/global';

class GlobalStateService {
  private initializeDefaultState(): DebugState {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSSafari = /iPad|iPhone|iPod/.test(userAgent) && /safari/i.test(userAgent);
    
    return {
      screen: 'Initializing...',
      messagesCount: 0,
      isLoading: false,
      hasInteracted: false,
      isTransitioning: false,
      lastAction: 'None',
      lastError: null,
      timestamp: new Date().toISOString(),
      inputState: 'Ready',
      authState: 'Unknown',
      lastWebhookCall: null,
      lastWebhookResponse: null,
      routeInfo: {
        pathname: window.location.pathname,
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash
      },
      browserInfo: {
        userAgent,
        platform: navigator?.platform || 'unknown',
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        isIOSSafari
      },
      performanceInfo: {
        memory: performance?.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : undefined,
        fps: 0
      },
      domInfo: {
        bodyChildren: document.body?.children.length || 0,
        totalElements: document.getElementsByTagName('*').length,
        inputElements: document.getElementsByTagName('input').length
      },
      supabaseInfo: {
        connectionStatus: 'unknown',
        lastConnectionAttempt: null,
        connectionLatency: null,
        authStatus: 'unknown',
        retryCount: 0,
        lastError: null,
        environment: null,
        isInitialized: false
      },
      bootstrapInfo: {
        stage: 'not_started',
        startTime: null,
        completionTime: null,
        steps: [],
        lastError: null
      },
      environmentInfo: {
        type: null,
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        publicVars: {}
      },
      storageInfo: {
        availableSpace: null,
        usedSpace: null,
        appKeys: [],
        errors: []
      },
      consoleLogs: []
    };
  }

  getDebugState(): DebugState {
    if (typeof window === 'undefined') {
      return this.initializeDefaultState();
    }

    if (!window.debugState) {
      window.debugState = this.initializeDefaultState();
    }

    return window.debugState;
  }

  updateDebugState(updates: Partial<DebugState>): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const currentState = this.getDebugState();
      window.debugState = {
        ...currentState,
        ...updates,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to update debug state', error, { module: 'global-state-service' });
    }
  }

  updateNestedState<K extends keyof DebugState>(
    key: K,
    updates: Partial<DebugState[K]>
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const currentState = this.getDebugState();
      this.updateDebugState({
        [key]: {
          ...currentState[key],
          ...updates
        }
      });
    } catch (error) {
      logger.error(`Failed to update ${key} in debug state`, error, { module: 'global-state-service' });
    }
  }

  clearDebugState(): void {
    if (typeof window !== 'undefined') {
      delete window.debugState;
    }
  }
}

export const globalStateService = new GlobalStateService();
