import { describe, expect, it } from 'vitest';
import {
  describeWeatherImpact,
  trafficIndexFor,
  trafficLevelLabel,
  weatherImpactTag,
  weatherTrafficBias,
} from './traffic';
import type { WeatherSnapshot } from '../weather/openMeteo';

function wx(partial: Partial<WeatherSnapshot>): WeatherSnapshot {
  return {
    tempC: 15,
    apparentTempC: 15,
    precipitationMm: 0,
    windKmh: 5,
    weatherCode: 0,
    daily: [],
    source: 'live',
    ...partial,
  };
}

describe('weatherTrafficBias', () => {
  it('is zero for clear weather', () => {
    expect(weatherTrafficBias(wx({ weatherCode: 0 }))).toBe(0);
    expect(weatherTrafficBias(null)).toBe(0);
  });

  it('is higher for snow than rain', () => {
    const rain = weatherTrafficBias(wx({ weatherCode: 63, precipitationMm: 2 }));
    const snow = weatherTrafficBias(wx({ weatherCode: 73, precipitationMm: 2 }));
    expect(rain).toBeGreaterThan(0);
    expect(snow).toBeGreaterThan(rain);
  });
});

describe('trafficLevelLabel', () => {
  it('classifies index into bands', () => {
    expect(trafficLevelLabel(10)).toBe('Light');
    expect(trafficLevelLabel(40)).toBe('Moderate');
    expect(trafficLevelLabel(60)).toBe('Heavy');
    expect(trafficLevelLabel(90)).toBe('Gridlock');
  });
});

describe('trafficIndexFor', () => {
  it('is higher during rush hour than overnight', () => {
    const rng = () => 0.5;
    expect(trafficIndexFor(8, 0, rng)).toBeGreaterThan(trafficIndexFor(3, 0, rng));
  });

  it('rises with a weather bias and stays within 0-100', () => {
    const rng = () => 0.5;
    const clear = trafficIndexFor(12, 0, rng);
    const stormy = trafficIndexFor(12, 1.2, rng);
    expect(stormy).toBeGreaterThan(clear);
    expect(trafficIndexFor(8, 5, rng)).toBeLessThanOrEqual(100);
    expect(trafficIndexFor(3, 0, rng)).toBeGreaterThanOrEqual(0);
  });
});

describe('weatherImpactTag', () => {
  it('is empty for clear and annotated for bad weather', () => {
    expect(weatherImpactTag(0)).toBe('');
    expect(weatherImpactTag(1)).toMatch(/weather \+\d+%/);
  });
});

describe('describeWeatherImpact', () => {
  it('reports normal traffic when clear', () => {
    expect(describeWeatherImpact(wx({ weatherCode: 0 })).label).toMatch(/normal traffic/);
  });

  it('reports congestion and collision percentages when stormy', () => {
    const impact = describeWeatherImpact(wx({ weatherCode: 73, precipitationMm: 3 }));
    expect(impact.trafficPct).toBeGreaterThan(0);
    expect(impact.collisionPct).toBeGreaterThan(0);
    expect(impact.label).toMatch(/congestion/);
  });
});
