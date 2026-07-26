import { describe, expect, it } from 'vitest';
import {
  CITIES,
  MAX_POINTS_PER_ROUND,
  createRng,
  createRounds,
  evaluateGuess,
  scoreGuess,
  totalScore,
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

describe('createRounds', () => {
  it('returns the requested number of unique cities', () => {
    const rounds = createRounds(5, 123);
    expect(rounds).toHaveLength(5);
    const names = rounds.map((r) => r.city.name);
    expect(new Set(names).size).toBe(5);
  });

  it('is reproducible for the same seed', () => {
    expect(createRounds(3, 999)).toEqual(createRounds(3, 999));
  });

  it('never asks for more rounds than there are cities', () => {
    const rounds = createRounds(CITIES.length + 10, 1);
    expect(rounds.length).toBeLessThanOrEqual(CITIES.length);
  });
});

describe('evaluateGuess and totalScore', () => {
  it('computes diff and points for a round', () => {
    const round = { city: CITIES[0], actualTempC: 10 };
    const result = evaluateGuess(round, 13);
    expect(result.diff).toBe(3);
    expect(result.points).toBe(88);
  });

  it('sums points across results', () => {
    const rounds = createRounds(3, 55);
    const results = rounds.map((r) => evaluateGuess(r, r.actualTempC));
    expect(totalScore(results)).toBe(3 * MAX_POINTS_PER_ROUND);
  });
});
