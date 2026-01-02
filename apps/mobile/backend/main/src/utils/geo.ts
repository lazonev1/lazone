/**
 * Geographic utility functions for distance calculations
 * Uses the Haversine formula for accurate Earth-surface distance
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula
 * @param coord1 - First coordinate (latitude, longitude)
 * @param coord2 - Second coordinate (latitude, longitude)
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validates if coordinates are valid
 */
export function isValidCoordinates(coords: Coordinates | undefined | null): boolean {
  if (!coords) return false;
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180 &&
    // Check if not default/zero coordinates
    (coords.latitude !== 0 || coords.longitude !== 0)
  );
}

