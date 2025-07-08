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

/**
 * Enhanced location service with improved reliability and performance
 */
class EnhancedLocationService {
  private watchId: number | null = null;
  private lastKnownLocation: LocationData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private geocodeCache = new Map<string, any>();
  private requestController: AbortController | null = null;
  private retryCount = 0;
  private maxRetries = 3;

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
   * Check permission state with better error handling
   */
  private async checkPermissionState(): Promise<PermissionState | null> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({name: 'geolocation'});
        return result.state;
      }
    } catch (error) {
      logger.debug('Permission API not available:', error, { module: 'enhanced-location' });
    }
    return null;
  }

  /**
   * Get current position with improved error handling and cancellation
   */
  async getCurrentPosition(): Promise<GeolocationResult> {
    if (!this.isSupported()) {
      return { success: false, error: 'Geolocation is not supported' };
    }

    // Cancel any ongoing request
    if (this.requestController) {
      this.requestController.abort();
    }
    this.requestController = new AbortController();

    // Check permission state first (except on iOS Safari where it's unreliable)
    if (!this.isIOSSafari()) {
      const permissionState = await this.checkPermissionState();
      if (permissionState === 'denied') {
        return { success: false, error: 'Location access denied. Please enable in browser settings.' };
      }
    }

    try {
      const position = await this.getPositionWithTimeout();
      const locationData = await this.processPosition(position);
      this.lastKnownLocation = locationData;
      this.retryCount = 0; // Reset retry count on success
      return { success: true, data: locationData };
    } catch (error: any) {
      logger.error('Error getting current position:', error, { module: 'enhanced-location' });
      
      // Implement retry logic with exponential backoff
      if (this.retryCount < this.maxRetries && error.code !== error.PERMISSION_DENIED) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        logger.info(`Retrying location request in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`, { module: 'enhanced-location' });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.getCurrentPosition();
      }
      
      this.retryCount = 0;
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Request location permission with improved UX
   */
  async requestLocationPermission(): Promise<GeolocationResult> {
    try {
      const result = await this.getCurrentPosition();
      if (result.success && result.data) {
        await this.saveLocationToDatabase(result.data, true);
        logger.info('Location permission granted and saved', { module: 'enhanced-location' });
      }
      return result;
    } catch (error: any) {
      logger.error('Error requesting location permission:', error, { module: 'enhanced-location' });
      return { success: false, error: 'Failed to request location permission' };
    }
  }

  /**
   * Start watching position changes with smart updates
   */
  startWatching(callback?: (location: LocationData) => void): void {
    if (!this.isSupported()) {
      logger.warn('Geolocation not supported for watching', null, { module: 'enhanced-location' });
      return;
    }

    // Stop any existing watch
    this.stopWatching();

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
              module: 'enhanced-location'
            });
          }
        } catch (error) {
          logger.error('Error processing watched position:', error, { module: 'enhanced-location' });
        }
      },
      (error) => {
        logger.error('Geolocation watch error:', error, { module: 'enhanced-location' });
        // Auto-retry on temporary errors
        if (error.code === error.POSITION_UNAVAILABLE) {
          setTimeout(() => this.startWatching(callback), 5000);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 2 * 60 * 1000 // 2 minutes cache
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
    this.stopPeriodicUpdates();
  }

  /**
   * Start smart periodic updates
   */
  startPeriodicUpdates(): void {
    this.stopPeriodicUpdates();

    // Smart interval: shorter when moving, longer when stationary
    const getUpdateInterval = () => {
      const now = Date.now();
      const lastUpdate = this.lastKnownLocation ? new Date(this.lastKnownLocation.timestamp).getTime() : 0;
      const timeSinceUpdate = now - lastUpdate;
      
      // If we haven't updated in a while, check more frequently
      return timeSinceUpdate > 30 * 60 * 1000 ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 or 15 minutes
    };

    const scheduleNextUpdate = () => {
      this.updateInterval = setTimeout(async () => {
        try {
          const result = await this.getCurrentPosition();
          if (result.success && result.data) {
            const shouldUpdate = this.shouldUpdateLocation(result.data);
            if (shouldUpdate) {
              await this.saveLocationToDatabase(result.data);
              logger.info('Periodic location update completed', { module: 'enhanced-location' });
            }
          }
        } catch (error) {
          logger.error('Error during periodic location update:', error, { module: 'enhanced-location' });
        } finally {
          scheduleNextUpdate(); // Schedule next update
        }
      }, getUpdateInterval());
    };

    scheduleNextUpdate();
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Enhanced reverse geocoding with caching
   */
  private async reverseGeocode(lat: number, lon: number) {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    
    // Check cache first
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: { 'User-Agent': 'IxtyAI-LocationService/2.0' },
          signal: this.requestController?.signal
        }
      );
      
      if (!response.ok) throw new Error('Geocoding service unavailable');

      const data = await response.json();
      const result = {
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        country: data.address?.country
      };

      // Cache result for 1 hour
      this.geocodeCache.set(cacheKey, result);
      setTimeout(() => this.geocodeCache.delete(cacheKey), 60 * 60 * 1000);

      return result;
    } catch (error) {
      if (error.name === 'AbortError') return { address: undefined, city: undefined, country: undefined };
      logger.warn('Reverse geocoding failed:', error, { module: 'enhanced-location' });
      return { address: undefined, city: undefined, country: undefined };
    }
  }

  /**
   * Promise wrapper for geolocation with timeout
   */
  private getPositionWithTimeout(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: !this.isIOSSafari(),
        timeout: this.isIOSSafari() ? 25000 : 15000,
        maximumAge: this.isIOSSafari() ? 10 * 60 * 1000 : 5 * 60 * 1000
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Process position with enhanced error handling
   */
  private async processPosition(position: GeolocationPosition): Promise<LocationData> {
    const { latitude, longitude } = position.coords;
    
    let address, city, country;
    try {
      const geocodeResult = await this.reverseGeocode(latitude, longitude);
      address = geocodeResult.address;
      city = geocodeResult.city;
      country = geocodeResult.country;
    } catch (error) {
      logger.warn('Failed to reverse geocode location:', error, { module: 'enhanced-location' });
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
   * Smart location update logic
   */
  private shouldUpdateLocation(newLocation: LocationData): boolean {
    if (!this.lastKnownLocation) return true;

    const distance = this.calculateDistance(
      this.lastKnownLocation.latitude,
      this.lastKnownLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    const timeDiff = Date.now() - new Date(this.lastKnownLocation.timestamp).getTime();
    const significantMove = distance > 0.05; // 50 meters
    const timeThreshold = 20 * 60 * 1000; // 20 minutes

    return significantMove || timeDiff > timeThreshold;
  }

  /**
   * Calculate distance between coordinates
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
   * Save location to database with error handling
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

      if (error) throw error;
      logger.info('Location saved to database successfully', { module: 'enhanced-location' });
    } catch (error) {
      logger.error('Failed to save location to database:', error, { module: 'enhanced-location' });
      throw error;
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: GeolocationPositionError): string {
    const baseMessages = {
      [error.PERMISSION_DENIED]: 'Location access denied by user',
      [error.POSITION_UNAVAILABLE]: 'Location information unavailable',
      [error.TIMEOUT]: 'Location request timed out'
    };

    let message = baseMessages[error.code] || 'An unknown error occurred while retrieving location';
    
    // Add iOS Safari specific guidance
    if (this.isIOSSafari() && error.code === error.PERMISSION_DENIED) {
      message += '. Please enable location services in Safari settings.';
    }

    return message;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopWatching();
    if (this.requestController) {
      this.requestController.abort();
      this.requestController = null;
    }
    this.geocodeCache.clear();
  }
}

export const enhancedLocationService = new EnhancedLocationService();