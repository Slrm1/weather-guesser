import { describe, expect, it } from 'vitest';
import { haversineKm, moveToward } from './geo';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 38.9, lon: -77 }, { lat: 38.9, lon: -77 })).toBe(0);
  });

  it('approximates a known distance (DC to NYC ~ 328 km)', () => {
    const dc = { lat: 38.9072, lon: -77.0369 };
    const nyc = { lat: 40.7128, lon: -74.006 };
    const d = haversineKm(dc, nyc);
    expect(d).toBeGreaterThan(320);
    expect(d).toBeLessThan(340);
  });
});

describe('moveToward', () => {
  it('arrives when within reach', () => {
    const from = { lat: 38.9, lon: -77 };
    const to = { lat: 38.91, lon: -77 };
    const res = moveToward(from, to, 1000);
    expect(res.arrived).toBe(true);
    expect(res.position).toEqual(to);
  });

  it('moves partway and reduces remaining distance when out of reach', () => {
    const from = { lat: 38.9, lon: -77 };
    const to = { lat: 39.9, lon: -77 };
    const before = haversineKm(from, to);
    const res = moveToward(from, to, 5);
    expect(res.arrived).toBe(false);
    const after = haversineKm(res.position, to);
    expect(after).toBeLessThan(before);
    expect(before - after).toBeGreaterThan(4);
    expect(before - after).toBeLessThan(6);
  });
});
