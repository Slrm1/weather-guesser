import { createRng } from '../game';

export interface DailyForecast {
  date: string;
  maxC: number;
  minC: number;
  precipMm: number;
  weatherCode: number;
}

export interface WeatherSnapshot {
  tempC: number;
  apparentTempC: number;
  precipitationMm: number;
  windKmh: number;
  weatherCode: number;
  daily: DailyForecast[];
  /** Whether the data came from the live API or the offline simulation. */
  source: 'live' | 'simulated';
}

export interface GeoResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Map a WMO weather code to a short label + emoji for display. */
export function describeWeatherCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear sky', emoji: '☀️' };
  if (code <= 2) return { label: 'Partly cloudy', emoji: '🌤️' };
  if (code === 3) return { label: 'Overcast', emoji: '☁️' };
  if (code <= 48) return { label: 'Fog', emoji: '🌫️' };
  if (code <= 57) return { label: 'Drizzle', emoji: '🌦️' };
  if (code <= 67) return { label: 'Rain', emoji: '🌧️' };
  if (code <= 77) return { label: 'Snow', emoji: '❄️' };
  if (code <= 82) return { label: 'Rain showers', emoji: '🌧️' };
  if (code <= 86) return { label: 'Snow showers', emoji: '🌨️' };
  return { label: 'Thunderstorm', emoji: '⛈️' };
}

/** Look up coordinates for a place name via Open-Meteo's free geocoding API. */
export async function geocodeCity(name: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  const results: GeoResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
    name: r.name as string,
    country: (r.country as string) ?? '',
    admin1: r.admin1 as string | undefined,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }));
  return results;
}

interface RawForecast {
  current?: Record<string, number>;
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    weather_code?: number[];
  };
}

/** Normalize the raw Open-Meteo forecast payload into a WeatherSnapshot. */
export function parseForecast(data: RawForecast): WeatherSnapshot {
  const current = data.current ?? {};
  const daily = data.daily ?? {};
  const dates: string[] = daily.time ?? [];
  const forecast: DailyForecast[] = dates.map((date, i) => ({
    date,
    maxC: Math.round(daily.temperature_2m_max?.[i] ?? 0),
    minC: Math.round(daily.temperature_2m_min?.[i] ?? 0),
    precipMm: Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
    weatherCode: daily.weather_code?.[i] ?? 0,
  }));

  return {
    tempC: Math.round(current.temperature_2m ?? 0),
    apparentTempC: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
    precipitationMm: Math.round((current.precipitation ?? 0) * 10) / 10,
    windKmh: Math.round(current.wind_speed_10m ?? 0),
    weatherCode: current.weather_code ?? 0,
    daily: forecast,
    source: 'live',
  };
}

/**
 * Deterministic offline fallback used when the live API cannot be reached, so
 * the app (and its tests) still work without network access. Temperature is
 * derived from latitude (colder toward the poles) with seeded variation.
 */
export function simulateWeather(latitude: number, longitude: number): WeatherSnapshot {
  const seed = Math.floor(Math.abs(latitude) * 1000 + Math.abs(longitude) * 7 + 1);
  const rng = createRng(seed);
  const baseTemp = 30 - Math.abs(latitude) * 0.55;
  const tempC = Math.round(baseTemp + (rng() - 0.5) * 10);
  const precipitationMm = Math.round(rng() * 8 * 10) / 10;
  const windKmh = Math.round(rng() * 35);
  const weatherCode = precipitationMm > 4 ? 63 : precipitationMm > 1 ? 3 : rng() > 0.5 ? 1 : 0;

  const daily: DailyForecast[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayVar = (rng() - 0.5) * 6;
    return {
      date: d.toISOString().slice(0, 10),
      maxC: Math.round(tempC + 4 + dayVar),
      minC: Math.round(tempC - 5 + dayVar),
      precipMm: Math.round(rng() * 6 * 10) / 10,
      weatherCode: rng() > 0.6 ? 61 : rng() > 0.3 ? 2 : 0,
    };
  });

  return {
    tempC,
    apparentTempC: tempC - Math.round(windKmh / 15),
    precipitationMm,
    windKmh,
    weatherCode,
    daily,
    source: 'simulated',
  };
}

/**
 * Fetch the current weather + short forecast for a location. Falls back to a
 * deterministic local simulation if the network request fails.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    timezone: 'auto',
    forecast_days: '5',
  });

  try {
    const res = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
    return parseForecast(await res.json());
  } catch (err) {
    if (signal?.aborted) throw err;
    return simulateWeather(latitude, longitude);
  }
}
