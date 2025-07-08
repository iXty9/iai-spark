import { useEffect, useCallback } from 'react';
import { enhancedLocationService, GeolocationResult } from '@/services/location/enhanced-location-service';
import { useLocationState } from './use-location-state';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';

/**
 * Enhanced location hook that consolidates all location functionality
 * Eliminates race conditions and provides better UX
 */
export function useEnhancedLocation() {
  const { user } = useAuth();
  const { state, actions, setLoading, setError, setLocationData } = useLocationState();

  /**
   * Request location permission and get initial location
   */
  const requestLocation = useCallback(async (): Promise<GeolocationResult> => {
    if (!user) {
      const error = 'User must be logged in to use location services';
      setError(error);
      return { success: false, error };
    }

    setLoading(true);
    
    try {
      const result = await enhancedLocationService.requestLocationPermission();
      
      if (result.success && result.data) {
        setLocationData(result.data, true);
        // Only start watching, not periodic updates to avoid dual polling
        // enhancedLocationService.startPeriodicUpdates();
      } else {
        setError(result.error || 'Failed to get location');
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to request location';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user, setLoading, setError, setLocationData]);

  /**
   * Get current location without requesting permission
   */
  const getCurrentLocation = useCallback(async (): Promise<GeolocationResult> => {
    setLoading(true);
    
    try {
      const result = await enhancedLocationService.getCurrentPosition();
      
      if (result.success && result.data) {
        setLocationData(result.data);
      } else {
        setError(result.error || 'Failed to get location');
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get current location';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setLoading, setError, setLocationData]);

  /**
   * Start watching for location changes
   */
  const startWatching = useCallback(() => {
    if (!state.hasPermission) {
      logger.warn('Cannot start watching location without permission', null, { module: 'enhanced-location-hook' });
      return;
    }

    actions.startWatching();
    enhancedLocationService.startWatching((location) => {
      setLocationData(location);
      logger.info('Location updated via watching', { module: 'enhanced-location-hook' });
    });
  }, [state.hasPermission, actions, setLocationData]);

  /**
   * Stop watching for location changes
   */
  const stopWatching = useCallback(() => {
    actions.stopWatching();
    enhancedLocationService.stopWatching();
  }, [actions]);

  /**
   * Clear location error
   */
  const clearError = useCallback(() => {
    actions.clearError();
  }, [actions]);

  // Initialize location state when user changes - fix circular dependencies
  useEffect(() => {
    if (!user) {
      actions.updateLocationState({
        isSupported: enhancedLocationService.isSupported(),
        hasPermission: false,
        isLoading: false,
        currentLocation: null,
        error: null,
        lastUpdated: null,
        isWatching: false
      });
      enhancedLocationService.cleanup();
    } else {
      // Check if we can detect existing permission
      const checkExistingPermission = async () => {
        try {
          if ('permissions' in navigator) {
            const result = await navigator.permissions.query({name: 'geolocation'});
            if (result.state === 'granted') {
              actions.updateLocationState({ hasPermission: true });
              // Try to get current location without triggering permission prompt
              const locationResult = await enhancedLocationService.getCurrentPosition();
              if (locationResult.success && locationResult.data) {
                setLocationData(locationResult.data);
              }
            }
          }
        } catch (error) {
          logger.debug('Permission check not available', null, { module: 'enhanced-location-hook' });
        }
      };
      
      checkExistingPermission();
    }
  }, [user]); // Remove actions and setLocationData to prevent circular deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enhancedLocationService.cleanup();
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