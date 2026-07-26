import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeWeatherCode,
  fetchWeather,
  geocodeCity,
  parseForecast,
  simulateWeather,
} from './openMeteo';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('describeWeatherCode', () => {
  it('maps codes to a label and emoji', () => {
    expect(describeWeatherCode(0).label).toBe('Clear sky');
    expect(describeWeatherCode(63).label).toBe('Rain');
    expect(describeWeatherCode(73).label).toBe('Snow');
    expect(describeWeatherCode(95).label).toBe('Thunderstorm');
  });
});

describe('parseForecast', () => {
  it('normalizes the raw API payload', () => {
    const raw = {
      current: {
        temperature_2m: 21.6,
        apparent_temperature: 20.1,
        precipitation: 0.34,
        weather_code: 3,
        wind_speed_10m: 12.9,
      },
      daily: {
        time: ['2026-07-26', '2026-07-27'],
        temperature_2m_max: [25.4, 26.1],
        temperature_2m_min: [15.2, 16.0],
        precipitation_sum: [1.23, 0],
        weather_code: [61, 0],
      },
    };
    const snap = parseForecast(raw);
    expect(snap.tempC).toBe(22);
    expect(snap.apparentTempC).toBe(20);
    expect(snap.windKmh).toBe(13);
    expect(snap.source).toBe('live');
    expect(snap.daily).toHaveLength(2);
    expect(snap.daily[0]).toMatchObject({ maxC: 25, minC: 15, weatherCode: 61 });
  });
});

describe('simulateWeather', () => {
  it('is deterministic and colder near the poles', () => {
    const tropics = simulateWeather(0, 0);
    const arctic = simulateWeather(80, 0);
    expect(simulateWeather(0, 0)).toEqual(tropics);
    expect(arctic.tempC).toBeLessThan(tropics.tempC);
    expect(tropics.source).toBe('simulated');
    expect(tropics.daily).toHaveLength(5);
  });
});

describe('geocodeCity', () => {
  it('parses geocoding results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Berlin', country: 'Germany', admin1: 'Berlin', latitude: 52.52, longitude: 13.41 },
          ],
        }),
      })),
    );
    const results = await geocodeCity('Berlin');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: 'Berlin', latitude: 52.52 });
  });
});

describe('fetchWeather', () => {
  it('returns live data when the request succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          current: { temperature_2m: 18, wind_speed_10m: 5, weather_code: 0 },
          daily: { time: [], temperature_2m_max: [], temperature_2m_min: [] },
        }),
      })),
    );
    const snap = await fetchWeather(52.52, 13.41);
    expect(snap.source).toBe('live');
    expect(snap.tempC).toBe(18);
  });

  it('falls back to simulated data when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const snap = await fetchWeather(52.52, 13.41);
    expect(snap.source).toBe('simulated');
  });
});
