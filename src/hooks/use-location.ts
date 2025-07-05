import { useState, useEffect, useCallback } from 'react';
import { locationService, LocationData, GeolocationResult } from '@/services/location/location-service';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';

export interface LocationState {
  isSupported: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  currentLocation: LocationData | null;
  error: string | null;
  lastUpdated: Date | null;
}

export function useLocation() {
  const { user } = useAuth();
  const [state, setState] = useState<LocationState>({
    isSupported: locationService.isSupported(),
    hasPermission: false,
    isLoading: false,
    currentLocation: null,
    error: null,
    lastUpdated: null
  });

  /**
   * Request location permission and get initial location
   */
  const requestLocation = useCallback(async (): Promise<GeolocationResult> => {
    if (!user) {
      const error = 'User must be logged in to use location services';
      setState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await locationService.requestLocationPermission();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasPermission: result.success,
        currentLocation: result.data || null,
        error: result.error || null,
        lastUpdated: result.success ? new Date() : null
      }));

      if (result.success) {
        logger.info('Location permission granted and initial location obtained', { module: 'location-hook' });
        // Start smart periodic updates
        locationService.startPeriodicUpdates();
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to request location';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  /**
   * Get current location (without saving permission state)
   */
  const getCurrentLocation = useCallback(async (): Promise<GeolocationResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await locationService.getCurrentPosition();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentLocation: result.data || prev.currentLocation,
        error: result.error || null,
        lastUpdated: result.success ? new Date() : prev.lastUpdated
      }));

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get current location';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Start watching for location changes
   */
  const startWatching = useCallback(() => {
    if (!state.hasPermission) {
      logger.warn('Cannot start watching location without permission', null, { module: 'location-hook' });
      return;
    }

    locationService.startWatching((location) => {
      setState(prev => ({
        ...prev,
        currentLocation: location,
        lastUpdated: new Date()
      }));
      logger.info('Location updated via watching', { module: 'location-hook' });
    });
  }, [state.hasPermission]);

  /**
   * Stop watching for location changes
   */
  const stopWatching = useCallback(() => {
    locationService.stopWatching();
  }, []);

  /**
   * Clear location error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize location state when user changes
  useEffect(() => {
    if (!user) {
      setState({
        isSupported: locationService.isSupported(),
        hasPermission: false,
        isLoading: false,
        currentLocation: null,
        error: null,
        lastUpdated: null
      });
      locationService.cleanup();
    } else {
      // Check if we can detect existing permission
      const checkExistingPermission = async () => {
        try {
          if ('permissions' in navigator) {
            const result = await navigator.permissions.query({name: 'geolocation'});
            if (result.state === 'granted') {
              setState(prev => ({ ...prev, hasPermission: true }));
              // Try to get current location without triggering permission prompt
              const locationResult = await locationService.getCurrentPosition();
              if (locationResult.success) {
                setState(prev => ({
                  ...prev,
                  currentLocation: locationResult.data || null,
                  lastUpdated: new Date(),
                  error: null
                }));
              }
            }
          }
        } catch (error) {
          // Permission API not available, that's ok
          logger.debug('Permission check not available', null, { module: 'location-hook' });
        }
      };
      
      checkExistingPermission();
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      locationService.cleanup();
    };
  }, []);

  return {
    ...state,
    requestLocation,
    getCurrentLocation,
    startWatching,
    stopWatching,
    clearError
  };
}