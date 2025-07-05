import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  timestamp: string;
}

export interface GeolocationResult {
  success: boolean;
  data?: LocationData;
  error?: string;
}

class LocationService {
  private watchId: number | null = null;
  private lastKnownLocation: LocationData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check if HTTPS is being used (required for iOS Safari)
   */
  private isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:';
  }

  /**
   * Detect iOS Safari
   */
  private isIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);
  }

  /**
   * Check permission state (if available)
   */
  private async checkPermissionState(): Promise<PermissionState | null> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({name: 'geolocation'});
        return result.state;
      }
    } catch (error) {
      logger.warn('Permission API not available:', error, { module: 'location' });
    }
    return null;
  }

  /**
   * Get current position
   */
  async getCurrentPosition(): Promise<GeolocationResult> {
    if (!this.isSupported()) {
      return { success: false, error: 'Geolocation is not supported' };
    }

    // Check for HTTPS requirement on iOS Safari
    if (this.isIOSSafari() && !this.isSecureContext()) {
      return { success: false, error: 'HTTPS is required for location services on iOS Safari' };
    }

    // Check permission state first if available
    const permissionState = await this.checkPermissionState();
    if (permissionState === 'denied') {
      return { success: false, error: 'Location access denied. Please enable in browser settings.' };
    }

    try {
      const position = await this.getPositionPromise();
      const locationData = await this.processPosition(position);
      this.lastKnownLocation = locationData;
      return { success: true, data: locationData };
    } catch (error: any) {
      logger.error('Error getting current position:', error, { module: 'location' });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Request location permission and get initial location
   */
  async requestLocationPermission(): Promise<GeolocationResult> {
    try {
      // For iOS Safari, try to request permission with user gesture
      if (this.isIOSSafari()) {
        logger.info('iOS Safari detected, requesting location with user gesture', { module: 'location' });
      }

      const result = await this.getCurrentPosition();
      if (result.success && result.data) {
        await this.saveLocationToDatabase(result.data, true);
        logger.info('Location permission granted and saved', { module: 'location' });
      } else {
        logger.warn('Location permission request failed:', result.error, { module: 'location' });
      }
      return result;
    } catch (error: any) {
      logger.error('Error requesting location permission:', error, { module: 'location' });
      return { success: false, error: 'Failed to request location permission' };
    }
  }

  /**
   * Start watching position changes
   */
  startWatching(callback?: (location: LocationData) => void): void {
    if (!this.isSupported()) {
      logger.warn('Geolocation not supported for watching', null, { module: 'location' });
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = await this.processPosition(position);
          const shouldUpdate = this.shouldUpdateLocation(locationData);
          
          if (shouldUpdate) {
            this.lastKnownLocation = locationData;
            await this.saveLocationToDatabase(locationData);
            callback?.(locationData);
            
            logger.info('Location updated via watching', {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              module: 'location'
            });
          }
        } catch (error) {
          logger.error('Error processing watched position:', error, { module: 'location' });
        }
      },
      (error) => {
        logger.error('Geolocation watch error:', error, { module: 'location' });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      }
    );
  }

  /**
   * Stop watching position changes
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Start periodic location updates (smart intervals)
   */
  startPeriodicUpdates(): void {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 10 minutes initially, can be made smarter based on movement patterns
    this.updateInterval = setInterval(async () => {
      try {
        const result = await this.getCurrentPosition();
        if (result.success && result.data) {
          const shouldUpdate = this.shouldUpdateLocation(result.data);
          if (shouldUpdate) {
            await this.saveLocationToDatabase(result.data);
            logger.info('Periodic location update completed', { module: 'location' });
          }
        }
      } catch (error) {
        logger.error('Error during periodic location update:', error, { module: 'location' });
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Save location to database
   */
  private async saveLocationToDatabase(locationData: LocationData, permissionGranted = false): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          location_latitude: locationData.latitude,
          location_longitude: locationData.longitude,
          location_address: locationData.address,
          location_city: locationData.city,
          location_country: locationData.country,
          location_updated_at: locationData.timestamp,
          ...(permissionGranted && { location_permission_granted: true })
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        logger.error('Error saving location to database:', error, { module: 'location' });
        throw error;
      }

      logger.info('Location saved to database successfully', { module: 'location' });
    } catch (error) {
      logger.error('Failed to save location to database:', error, { module: 'location' });
      throw error;
    }
  }

  /**
   * Determine if location should be updated (smart logic)
   */
  private shouldUpdateLocation(newLocation: LocationData): boolean {
    if (!this.lastKnownLocation) return true;

    // Calculate distance between old and new location (simple Haversine formula)
    const distance = this.calculateDistance(
      this.lastKnownLocation.latitude,
      this.lastKnownLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Update if moved more than 100 meters or if it's been more than 30 minutes
    const timeDiff = Date.now() - new Date(this.lastKnownLocation.timestamp).getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    return distance > 0.1 || timeDiff > thirtyMinutes; // 0.1 km = 100 meters
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert geolocation position to our LocationData format
   */
  private async processPosition(position: GeolocationPosition): Promise<LocationData> {
    const { latitude, longitude } = position.coords;
    
    // Try to get address information via reverse geocoding
    let address, city, country;
    try {
      const geocodeResult = await this.reverseGeocode(latitude, longitude);
      address = geocodeResult.address;
      city = geocodeResult.city;
      country = geocodeResult.country;
    } catch (error) {
      logger.warn('Failed to reverse geocode location:', error, { module: 'location' });
    }

    return {
      latitude,
      longitude,
      address,
      city,
      country,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Simple reverse geocoding using a free service
   */
  private async reverseGeocode(lat: number, lon: number) {
    try {
      // Using OpenStreetMap Nominatim (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'IxtyAI-LocationService/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      return {
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        country: data.address?.country
      };
    } catch (error) {
      logger.warn('Reverse geocoding failed:', error, { module: 'location' });
      return { address: undefined, city: undefined, country: undefined };
    }
  }

  /**
   * Promise wrapper for geolocation getCurrentPosition
   */
  private getPositionPromise(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      // Use different options for iOS Safari
      const options = this.isIOSSafari() ? {
        enableHighAccuracy: false, // Less aggressive for iOS Safari
        timeout: 20000, // Longer timeout for iOS
        maximumAge: 10 * 60 * 1000 // 10 minutes cache for iOS
      } : {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        options
      );
    });
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return 'An unknown error occurred while retrieving location';
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopWatching();
    this.stopPeriodicUpdates();
  }
}

export const locationService = new LocationService();