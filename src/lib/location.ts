import ngeohash from 'ngeohash';

/**
 * Location data with optional enhanced information
 */
export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number; // GPS accuracy in meters
  address?: string; // Reverse geocoded address
  geohash?: string; // Geohash for proximity queries
}

/**
 * Geohash precision levels and their approximate cell sizes
 * Precision 6: ~1.2 km
 * Precision 7: ~150 m
 * Precision 8: ~19 m
 */
const GEOHASH_PRECISION = 7; // ~150m precision for duplicate detection

/**
 * Generate a geohash from coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @param precision - Geohash precision (default: 7 for ~150m)
 */
export function encodeGeohash(lat: number, lng: number, precision = GEOHASH_PRECISION): string {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * Decode a geohash back to coordinates
 * @param hash - Geohash string
 */
export function decodeGeohash(hash: string): { latitude: number; longitude: number } {
  return ngeohash.decode(hash);
}

/**
 * Get neighboring geohashes for a given geohash
 * Used to query reports in adjacent cells
 * @param hash - Center geohash
 */
export function getNeighborGeohashes(hash: string): string[] {
  const neighbors = ngeohash.neighbors(hash);
  return [hash, ...Object.values(neighbors)];
}

/**
 * Calculate the Haversine distance between two points in meters
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if two locations are within a specified distance
 * @param loc1 - First location
 * @param loc2 - Second location
 * @param maxDistance - Maximum distance in meters
 */
export function isWithinDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number },
  maxDistance: number,
): boolean {
  const distance = calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  return distance <= maxDistance;
}

/**
 * Default radius for duplicate detection (50 meters)
 */
export const DUPLICATE_DETECTION_RADIUS = 50;

/**
 * Time window for duplicate detection (7 days in milliseconds)
 */
export const DUPLICATE_DETECTION_WINDOW = 7 * 24 * 60 * 60 * 1000;

/**
 * Format coordinates for display
 * @param lat - Latitude
 * @param lng - Longitude
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Create a Google Maps URL for a location
 * @param lat - Latitude
 * @param lng - Longitude
 */
export function createMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Validate coordinates are within valid ranges
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Check if coordinates are roughly in Coatepec, Veracruz area
 * Used to warn users if they're reporting outside the service area
 * Coatepec is approximately at: 19.4545° N, 96.9612° W
 */
export function isInServiceArea(lat: number, lng: number): boolean {
  const COATEPEC_CENTER = { lat: 19.4545, lng: -96.9612 };
  const SERVICE_RADIUS = 15000; // 15 km radius

  const distance = calculateDistance(lat, lng, COATEPEC_CENTER.lat, COATEPEC_CENTER.lng);
  return distance <= SERVICE_RADIUS;
}
