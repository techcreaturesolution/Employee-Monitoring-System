import * as Location from 'expo-location';
import { mobileAPI } from './api';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

let locationSubscription: Location.LocationSubscription | null = null;
let locationBuffer: Array<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}> = [];

export const requestLocationPermission = async (): Promise<boolean> => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === 'granted';
};

export const getCurrentLocation = async (): Promise<LocationCoords | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return location.coords;
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
};

export const startLocationTracking = async (intervalMinutes: number = 15): Promise<void> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('Location permission not granted');
      return;
    }

    stopLocationTracking();

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalMinutes * 60 * 1000,
        distanceInterval: 50,
      },
      (location) => {
        const point = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          timestamp: new Date(location.timestamp).toISOString(),
        };

        locationBuffer.push(point);

        if (locationBuffer.length >= 5) {
          flushLocationBuffer();
        }
      }
    );
  } catch (error) {
    console.error('Failed to start location tracking:', error);
  }
};

export const stopLocationTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  flushLocationBuffer();
};

export const flushLocationBuffer = async (): Promise<void> => {
  if (locationBuffer.length === 0) return;

  try {
    const batch = [...locationBuffer];
    locationBuffer = [];
    await mobileAPI.batchTrackLocations(batch);
  } catch (error) {
    console.error('Failed to flush location buffer:', error);
  }
};

export const sendSingleLocation = async (coords: LocationCoords): Promise<{
  isInsideGeofence: boolean;
} | null> => {
  try {
    const res = await mobileAPI.trackLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || 0,
      source: 'mobile',
    });
    return res.data.data;
  } catch (error) {
    console.error('Failed to send location:', error);
    return null;
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const addr = results[0];
      const parts = [addr.street, addr.city, addr.region].filter(Boolean);
      return parts.join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
};
