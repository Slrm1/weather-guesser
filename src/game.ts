export interface City {
  name: string;
  country: string;
  emoji: string;
  latitude: number;
  longitude: number;
}

/** A few well-known cities used for the "surprise me" quick-pick. */
export const CITIES: City[] = [
  { name: 'Reykjavik', country: 'Iceland', emoji: '🇮🇸', latitude: 64.15, longitude: -21.94 },
  { name: 'Cairo', country: 'Egypt', emoji: '🇪🇬', latitude: 30.04, longitude: 31.24 },
  { name: 'Singapore', country: 'Singapore', emoji: '🇸🇬', latitude: 1.35, longitude: 103.82 },
  { name: 'Moscow', country: 'Russia', emoji: '🇷🇺', latitude: 55.75, longitude: 37.62 },
  { name: 'Sydney', country: 'Australia', emoji: '🇦🇺', latitude: -33.87, longitude: 151.21 },
  { name: 'Nairobi', country: 'Kenya', emoji: '🇰🇪', latitude: -1.29, longitude: 36.82 },
  { name: 'London', country: 'United Kingdom', emoji: '🇬🇧', latitude: 51.51, longitude: -0.13 },
  { name: 'Rio de Janeiro', country: 'Brazil', emoji: '🇧🇷', latitude: -22.91, longitude: -43.17 },
  { name: 'Toronto', country: 'Canada', emoji: '🇨🇦', latitude: 43.65, longitude: -79.38 },
  { name: 'Bangkok', country: 'Thailand', emoji: '🇹🇭', latitude: 13.76, longitude: 100.5 },
];

export const MAX_POINTS_PER_ROUND = 100;

/**
 * Deterministic pseudo-random generator (mulberry32) so simulations are
 * reproducible from a seed. Returns a function yielding floats in [0, 1).
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Score a single temperature guess. Exact guesses earn the maximum; points fall
 * off by roughly 4 per degree of error and never go below 0.
 */
export function scoreGuess(actualTempC: number, guessTempC: number): number {
  const diff = Math.abs(actualTempC - guessTempC);
  const points = Math.round(MAX_POINTS_PER_ROUND - diff * 4);
  return Math.max(0, points);
}

export function pickRandomCity(rng: () => number = Math.random): City {
  return CITIES[Math.floor(rng() * CITIES.length)];
}
