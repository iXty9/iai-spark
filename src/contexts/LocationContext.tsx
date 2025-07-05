import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, LocationState } from '@/hooks/use-location';
import { logger } from '@/utils/logging';

interface LocationContextType extends LocationState {
  requestLocationPermission: () => Promise<void>;
  initializeLocation: () => Promise<void>;
  refreshLocation: () => Promise<{ success: boolean; error?: string }>;
  handleAutoUpdateToggle: (enabled: boolean) => Promise<{ success: boolean }>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const { user, profile, updateProfile } = useAuth();
  const location = useLocation();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize location on user login if permission was previously granted
  useEffect(() => {
    if (user && profile && !hasInitialized) {
      setHasInitialized(true);
      initializeLocationForUser();
    }
  }, [user, profile, hasInitialized]);

  const initializeLocationForUser = async () => {
    if (!profile) return;

    // Check if user previously granted permission
    if (profile.location_permission_granted) {
      try {
        const result = await location.getCurrentLocation();
        if (result.success) {
          logger.info('Location initialized from existing permission', { module: 'location-context' });
          // Start periodic updates if user has auto-update enabled
          if (profile.location_auto_update !== false) {
            location.startWatching();
          }
        }
      } catch (error) {
        logger.error('Failed to initialize location with existing permission:', error, { module: 'location-context' });
      }
    }
  };

  const requestLocationPermission = async () => {
    const result = await location.requestLocation();
    if (result.success && updateProfile) {
      try {
        await updateProfile({ 
          location_permission_granted: true,
          location_auto_update: true 
        });
        logger.info('Location permission granted and saved to profile', { module: 'location-context' });
      } catch (error) {
        logger.error('Failed to update profile with location permission:', error, { module: 'location-context' });
      }
    }
  };

  const initializeLocation = async () => {
    if (!location.hasPermission) {
      await requestLocationPermission();
    } else {
      await location.getCurrentLocation();
    }
  };

  const refreshLocation = async () => {
    const result = await location.getCurrentLocation();
    if (result.success) {
      logger.info('Location refreshed manually', { module: 'location-context' });
    }
    return { success: result.success, error: result.error };
  };

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    if (!updateProfile) return { success: false };
    
    try {
      await updateProfile({ location_auto_update: enabled });
      
      // Start or stop location watching based on the setting
      if (enabled && location.hasPermission) {
        location.startWatching();
        logger.info('Location auto-update enabled and watching started', { module: 'location-context' });
      } else {
        location.stopWatching();
        logger.info('Location auto-update disabled and watching stopped', { module: 'location-context' });
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to update location auto-update setting:', error, { module: 'location-context' });
      throw error;
    }
  };

  const value: LocationContextType = {
    ...location,
    requestLocationPermission,
    initializeLocation,
    refreshLocation,
    handleAutoUpdateToggle,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};