import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, LocationState } from '@/hooks/use-location';
import { logger } from '@/utils/logging';
import { locationService } from '@/services/location/location-service';
interface LocationContextType extends LocationState {
  requestLocationPermission: () => Promise<void>;
  initializeLocation: () => Promise<void>;
  refreshLocation: () => Promise<{ success: boolean; error?: string }>;
  handleAutoUpdateToggle: (enabled: boolean) => Promise<{ success: boolean }>;
  // Phase 2 additions
  permissionMismatch: boolean;
  syncPermissionState: () => Promise<{ success: boolean; browser: PermissionState | null }>;
  handleCoarseModeToggle: (enabled: boolean) => Promise<{ success: boolean }>;
  handleIncludeAddressToggle: (enabled: boolean) => Promise<{ success: boolean }>;
  clearSavedLocation: () => Promise<{ success: boolean; error?: string }>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const { user, profile, updateProfile } = useAuth();
  const location = useLocation();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [permissionMismatch, setPermissionMismatch] = useState(false);

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
      // Update profile first
      await updateProfile({ location_auto_update: enabled });
      
      // Then handle location watching with proper error handling
      try {
        if (enabled && location.hasPermission) {
          location.startWatching();
          logger.info('Location auto-update enabled and watching started', { module: 'location-context' });
        } else {
          location.stopWatching();
          logger.info('Location auto-update disabled and watching stopped', { module: 'location-context' });
        }
      } catch (watchError) {
        logger.error('Failed to start/stop location watching:', watchError, { module: 'location-context' });
        // Don't fail the entire operation if watching fails
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to update location auto-update setting:', error, { module: 'location-context' });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Apply privacy options from profile
  useEffect(() => {
    if (!profile) return;
    locationService.setPrivacyOptions({
      useCoarse: (profile as any)?.location_use_coarse ?? false,
      includeAddress: (profile as any)?.location_include_address !== false,
    });
  }, [profile]);

  // Compute permission mismatch between browser and profile flag
  useEffect(() => {
    const profileGranted = profile?.location_permission_granted ?? false;
    setPermissionMismatch(profileGranted !== location.hasPermission);
  }, [profile?.location_permission_granted, location.hasPermission]);

  const syncPermissionState = async (): Promise<{ success: boolean; browser: PermissionState | null }> => {
    let browser: PermissionState | null = null;
    try {
      if ('permissions' in navigator) {
        const res: any = await (navigator.permissions as any).query({ name: 'geolocation' as any });
        browser = res.state as PermissionState;
      }
      if (!updateProfile) return { success: false, browser };

      const granted = browser === 'granted';
      const current = profile?.location_permission_granted ?? false;
      if (granted !== current) {
        await updateProfile({ location_permission_granted: granted, ...(granted ? {} : { location_auto_update: false }) });
        if (granted) {
          // Optionally start watching if user has auto-update enabled
          if (profile?.location_auto_update !== false) {
            location.startWatching();
          }
        } else {
          location.stopWatching();
        }
      }
      return { success: true, browser };
    } catch (e) {
      logger.error('Failed to sync permission state', e, { module: 'location-context' });
      return { success: false, browser };
    }
  };

  const handleCoarseModeToggle = async (enabled: boolean) => {
    if (!updateProfile) return { success: false } as const;
    try {
      await (updateProfile as any)({ location_use_coarse: enabled });
      locationService.setPrivacyOptions({ useCoarse: enabled });
      logger.info('Updated coarse location preference', { module: 'location-context', enabled });
      return { success: true } as const;
    } catch (e) {
      logger.error('Failed to update coarse preference', e, { module: 'location-context' });
      return { success: false } as const;
    }
  };

  const handleIncludeAddressToggle = async (enabled: boolean) => {
    if (!updateProfile) return { success: false } as const;
    try {
      await (updateProfile as any)({ location_include_address: enabled });
      locationService.setPrivacyOptions({ includeAddress: enabled });
      logger.info('Updated include address preference', { module: 'location-context', enabled });
      return { success: true } as const;
    } catch (e) {
      logger.error('Failed to update include address preference', e, { module: 'location-context' });
      return { success: false } as const;
    }
  };

  const clearSavedLocation = async () => {
    if (!updateProfile) return { success: false } as const;
    try {
      await updateProfile({
        location_latitude: null as any,
        location_longitude: null as any,
        location_address: null as any,
        location_city: null as any,
        location_country: null as any,
        location_updated_at: null as any,
      });
      location.stopWatching();
      logger.info('Cleared saved location data', { module: 'location-context' });
      return { success: true } as const;
    } catch (e) {
      logger.error('Failed to clear saved location', e, { module: 'location-context' });
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' } as const;
    }
  };

  const value: LocationContextType = {
    ...location,
    requestLocationPermission,
    initializeLocation,
    refreshLocation,
    handleAutoUpdateToggle,
    // Phase 2 additions
    permissionMismatch,
    syncPermissionState,
    handleCoarseModeToggle,
    handleIncludeAddressToggle,
    clearSavedLocation,
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