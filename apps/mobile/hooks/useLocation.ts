import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface UseLocationResult {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

/**
 * Custom hook for managing user's current location
 * Handles permissions and provides location data for distance calculations
 * Distance is calculated based on who is searching - each user gets their own location
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied');
        setIsLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err: any) {
      console.error('Error getting location:', err);
      setError(err.message || 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    isLoading,
    error,
    refreshLocation: requestLocation,
  };
}

