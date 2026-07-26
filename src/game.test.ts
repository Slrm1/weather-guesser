import { describe, expect, it } from 'vitest';
import {
  CITIES,
  MAX_POINTS_PER_ROUND,
  createRng,
  pickRandomCity,
  scoreGuess,
} from './game';

describe('scoreGuess', () => {
  it('awards the maximum for an exact guess', () => {
    expect(scoreGuess(20, 20)).toBe(MAX_POINTS_PER_ROUND);
  });

  it('reduces points as the guess gets further off', () => {
    expect(scoreGuess(20, 25)).toBe(80);
    expect(scoreGuess(20, 15)).toBe(80);
  });

  it('never returns a negative score', () => {
    expect(scoreGuess(20, 100)).toBe(0);
    expect(scoreGuess(0, -100)).toBe(0);
  });
});

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('CITIES', () => {
  it('all have valid coordinates', () => {
    for (const c of CITIES) {
      expect(c.latitude).toBeGreaterThanOrEqual(-90);
      expect(c.latitude).toBeLessThanOrEqual(90);
      expect(c.longitude).toBeGreaterThanOrEqual(-180);
      expect(c.longitude).toBeLessThanOrEqual(180);
    }
  });
});

describe('pickRandomCity', () => {
  it('returns a city from the list', () => {
    const city = pickRandomCity(() => 0);
    expect(city).toEqual(CITIES[0]);
  });
});
