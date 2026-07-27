import { describe, expect, it } from 'vitest';
import {
  energyDemand,
  irrigationNeed,
  levelFor,
  simulateResponses,
  trafficRisk,
} from './response';
import type { WeatherSnapshot } from '../weather/openMeteo';

const base: WeatherSnapshot = {
  tempC: 20,
  apparentTempC: 20,
  precipitationMm: 0,
  windKmh: 0,
  weatherCode: 0,
  daily: [],
  source: 'live',
};

describe('levelFor', () => {
  it('classifies values into low/moderate/high bands', () => {
    expect(levelFor(10)).toBe('low');
    expect(levelFor(50)).toBe('moderate');
    expect(levelFor(80)).toBe('high');
  });
});

describe('energyDemand', () => {
  it('is higher in the cold than in comfortable weather', () => {
    const cold = energyDemand({ tempC: -10, windKmh: 0 });
    const mild = energyDemand({ tempC: 20, windKmh: 0 });
    expect(cold.value).toBeGreaterThan(mild.value);
  });

  it('is higher in extreme heat than in comfortable weather', () => {
    const hot = energyDemand({ tempC: 40, windKmh: 0 });
    const mild = energyDemand({ tempC: 20, windKmh: 0 });
    expect(hot.value).toBeGreaterThan(mild.value);
  });

  it('clamps output between 0 and 100', () => {
    const v = energyDemand({ tempC: -60, windKmh: 200 }).value;
    expect(v).toBeLessThanOrEqual(100);
    expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('irrigationNeed', () => {
  it('drops when it rains', () => {
    const dry = irrigationNeed({ tempC: 35, precipitationMm: 0, windKmh: 10 });
    const wet = irrigationNeed({ tempC: 35, precipitationMm: 10, windKmh: 10 });
    expect(wet.value).toBeLessThan(dry.value);
  });
});

describe('trafficRisk', () => {
  it('rates snow as riskier than clear skies with the same rain', () => {
    const snow = trafficRisk({ precipitationMm: 1, windKmh: 10, weatherCode: 73 });
    const clear = trafficRisk({ precipitationMm: 1, windKmh: 10, weatherCode: 0 });
    expect(snow.value).toBeGreaterThan(clear.value);
  });
});

describe('simulateResponses', () => {
  it('returns one metric per system', () => {
    const metrics = simulateResponses(base);
    expect(metrics.map((m) => m.key)).toEqual(['energy', 'irrigation', 'traffic']);
    for (const m of metrics) {
      expect(m.value).toBeGreaterThanOrEqual(0);
      expect(m.value).toBeLessThanOrEqual(100);
    }
  });
});
