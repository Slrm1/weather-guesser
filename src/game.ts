export interface City {
  name: string;
  country: string;
  /** Typical/average temperature in Celsius used as the round baseline. */
  baseTempC: number;
  emoji: string;
}

export interface Round {
  city: City;
  /** The actual temperature (Celsius) the player must guess. */
  actualTempC: number;
}

export interface RoundResult {
  round: Round;
  guessTempC: number;
  diff: number;
  points: number;
}

/** A small, self-contained dataset so the game works with no external API. */
export const CITIES: City[] = [
  { name: 'Reykjavik', country: 'Iceland', baseTempC: 5, emoji: '🇮🇸' },
  { name: 'Cairo', country: 'Egypt', baseTempC: 28, emoji: '🇪🇬' },
  { name: 'Singapore', country: 'Singapore', baseTempC: 31, emoji: '🇸🇬' },
  { name: 'Moscow', country: 'Russia', baseTempC: -2, emoji: '🇷🇺' },
  { name: 'Sydney', country: 'Australia', baseTempC: 23, emoji: '🇦🇺' },
  { name: 'Nairobi', country: 'Kenya', baseTempC: 20, emoji: '🇰🇪' },
  { name: 'London', country: 'United Kingdom', baseTempC: 12, emoji: '🇬🇧' },
  { name: 'Rio de Janeiro', country: 'Brazil', baseTempC: 27, emoji: '🇧🇷' },
  { name: 'Toronto', country: 'Canada', baseTempC: 9, emoji: '🇨🇦' },
  { name: 'Bangkok', country: 'Thailand', baseTempC: 33, emoji: '🇹🇭' },
];

export const MAX_POINTS_PER_ROUND = 100;

/**
 * Deterministic pseudo-random generator (mulberry32) so games are reproducible
 * from a seed. Returns a function yielding floats in [0, 1).
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
 * Score a single guess. Exact guesses earn the maximum; points fall off by
 * roughly 4 per degree of error and never go below 0.
 */
export function scoreGuess(actualTempC: number, guessTempC: number): number {
  const diff = Math.abs(actualTempC - guessTempC);
  const points = Math.round(MAX_POINTS_PER_ROUND - diff * 4);
  return Math.max(0, points);
}

/** Build a list of rounds with per-round temperature variation from the seed. */
export function createRounds(count: number, seed: number = Date.now()): Round[] {
  const rng = createRng(seed);
  const pool = [...CITIES];
  const rounds: Round[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const [city] = pool.splice(idx, 1);
    // Vary the baseline by +/- 6 degrees for the actual round temperature.
    const variation = Math.round((rng() - 0.5) * 12);
    rounds.push({ city, actualTempC: city.baseTempC + variation });
  }

  return rounds;
}

/** Combine a guess with its round to produce a scored result. */
export function evaluateGuess(round: Round, guessTempC: number): RoundResult {
  const diff = Math.abs(round.actualTempC - guessTempC);
  return {
    round,
    guessTempC,
    diff,
    points: scoreGuess(round.actualTempC, guessTempC),
  };
}

export function totalScore(results: RoundResult[]): number {
  return results.reduce((sum, r) => sum + r.points, 0);
}
