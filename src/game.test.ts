import { describe, expect, it } from 'vitest';
import { CITIES, createRng, pickRandomCity } from './game';

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
