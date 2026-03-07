import { calculateDistance, isValidCoordinates, Coordinates } from '../../backend/main/src/utils/geo';

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const coord: Coordinates = { latitude: 45.5017, longitude: -73.5673 };
    expect(calculateDistance(coord, coord)).toBe(0);
  });

  it('calculates distance between Montreal and Toronto (~503 km)', () => {
    const montreal: Coordinates = { latitude: 45.5017, longitude: -73.5673 };
    const toronto: Coordinates = { latitude: 43.6532, longitude: -79.3832 };
    const distance = calculateDistance(montreal, toronto);
    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(510);
  });

  it('calculates distance between New York and London (~5570 km)', () => {
    const newYork: Coordinates = { latitude: 40.7128, longitude: -74.006 };
    const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
    const distance = calculateDistance(newYork, london);
    expect(distance).toBeGreaterThan(5550);
    expect(distance).toBeLessThan(5600);
  });

  it('calculates distance between antipodal points (~20000 km)', () => {
    const north: Coordinates = { latitude: 90, longitude: 0 };
    const south: Coordinates = { latitude: -90, longitude: 0 };
    const distance = calculateDistance(north, south);
    // Should be approximately half the Earth circumference
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20100);
  });

  it('is symmetric (A→B equals B→A)', () => {
    const a: Coordinates = { latitude: 48.8566, longitude: 2.3522 }; // Paris
    const b: Coordinates = { latitude: 35.6762, longitude: 139.6503 }; // Tokyo
    expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 5);
  });

  it('handles coordinates crossing the date line', () => {
    const a: Coordinates = { latitude: 0, longitude: 179 };
    const b: Coordinates = { latitude: 0, longitude: -179 };
    const distance = calculateDistance(a, b);
    // Should be ~222 km (2 degrees at equator), not ~39800 km
    expect(distance).toBeLessThan(300);
  });
});

describe('isValidCoordinates', () => {
  it('returns true for valid coordinates', () => {
    expect(isValidCoordinates({ latitude: 45.5017, longitude: -73.5673 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidCoordinates(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidCoordinates(undefined)).toBe(false);
  });

  it('returns false for (0, 0) — treated as default/invalid', () => {
    expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(false);
  });

  it('returns true when only one of lat/lng is 0', () => {
    expect(isValidCoordinates({ latitude: 0, longitude: 10 })).toBe(true);
    expect(isValidCoordinates({ latitude: 10, longitude: 0 })).toBe(true);
  });

  it('returns false for latitude out of range', () => {
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
  });

  it('returns false for longitude out of range', () => {
    expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
  });

  it('returns true for boundary values', () => {
    expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
  });

  it('returns false for non-number latitude', () => {
    expect(isValidCoordinates({ latitude: 'abc' as any, longitude: 10 })).toBe(false);
  });

  it('returns false for non-number longitude', () => {
    expect(isValidCoordinates({ latitude: 10, longitude: null as any })).toBe(false);
  });
});
