import { useState, useCallback, useRef } from 'react';
import { LocationData, GeolocationResult } from '@/services/location/location-service';
import { logger } from '@/utils/logging';

export interface LocationState {
  isSupported: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  currentLocation: LocationData | null;
  error: string | null;
  lastUpdated: Date | null;
  isWatching: boolean;
}

export interface LocationActions {
  requestLocation: () => Promise<GeolocationResult>;
  getCurrentLocation: () => Promise<GeolocationResult>;
  startWatching: () => void;
  stopWatching: () => void;
  clearError: () => void;
  updateLocationState: (updates: Partial<LocationState>) => void;
}

/**
 * Consolidated location state management hook
 * Eliminates race conditions and provides single source of truth
 */
export function useLocationState() {
  const [state, setState] = useState<LocationState>({
    isSupported: 'geolocation' in navigator,
    hasPermission: false,
    isLoading: false,
    currentLocation: null,
    error: null,
    lastUpdated: null,
    isWatching: false
  });

  // Prevent concurrent operations
  const operationInProgress = useRef(false);
  
  const updateLocationState = useCallback((updates: Partial<LocationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    updateLocationState({ isLoading: loading });
  }, [updateLocationState]);

  const setError = useCallback((error: string | null) => {
    updateLocationState({ error, isLoading: false });
  }, [updateLocationState]);

  const clearError = useCallback(() => {
    updateLocationState({ error: null });
  }, [updateLocationState]);

  const setLocationData = useCallback((data: LocationData | null, hasPermission = false) => {
    updateLocationState({
      currentLocation: data,
      lastUpdated: data ? new Date() : null,
      hasPermission: hasPermission || state.hasPermission,
      isLoading: false,
      error: null
    });
  }, [updateLocationState, state.hasPermission]);

  // Prevent concurrent operations
  const withOperationLock = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    if (operationInProgress.current) {
      logger.warn('Location operation already in progress, skipping', null, { module: 'location-state' });
      return null;
    }

    operationInProgress.current = true;
    try {
      return await operation();
    } finally {
      operationInProgress.current = false;
    }
  }, []);

  const actions: LocationActions = {
    requestLocation: useCallback(async () => {
      const result = await withOperationLock(async () => {
        // Implementation will be handled by the service layer
        return { success: false, error: 'Not implemented' };
      });
      return result || { success: false, error: 'Operation in progress' };
    }, [withOperationLock]),

    getCurrentLocation: useCallback(async () => {
      const result = await withOperationLock(async () => {
        // Implementation will be handled by the service layer
        return { success: false, error: 'Not implemented' };
      });
      return result || { success: false, error: 'Operation in progress' };
    }, [withOperationLock]),

    startWatching: useCallback(() => {
      updateLocationState({ isWatching: true });
    }, [updateLocationState]),

    stopWatching: useCallback(() => {
      updateLocationState({ isWatching: false });
    }, [updateLocationState]),

    clearError,
    updateLocationState
  };

  return {
    state,
    actions,
    setLoading,
    setError,
    setLocationData
  };
}