import { describeWeatherCode, type WeatherSnapshot } from '../weather/openMeteo';

export interface Corridor {
  name: string;
  lat: number;
  lon: number;
}

/** Major DMV highway corridors used for traffic reporting. */
export const CORRIDORS: Corridor[] = [
  { name: 'I-495 Beltway @ Springfield', lat: 38.77, lon: -77.17 },
  { name: 'I-495 Beltway @ Bethesda', lat: 38.99, lon: -77.14 },
  { name: 'I-66 @ Arlington', lat: 38.88, lon: -77.13 },
  { name: 'I-395 @ Shirlington', lat: 38.84, lon: -77.08 },
  { name: 'I-95 @ Springfield', lat: 38.78, lon: -77.18 },
  { name: 'DC-295 @ Anacostia Fwy', lat: 38.9, lon: -76.96 },
  { name: 'I-270 @ Rockville', lat: 39.08, lon: -77.15 },
  { name: 'US-50 @ New York Ave', lat: 38.92, lon: -76.98 },
  { name: 'GW Parkway @ Rosslyn', lat: 38.9, lon: -77.07 },
  { name: 'VA-7 @ Tysons', lat: 38.92, lon: -77.22 },
  { name: 'I-95 @ Largo (MD)', lat: 38.86, lon: -76.84 },
  { name: 'Wilson Bridge (I-495)', lat: 38.79, lon: -77.02 },
];

export type TrafficLevel = 'Light' | 'Moderate' | 'Heavy' | 'Gridlock';

export function clampIndex(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function trafficLevelLabel(index: number): TrafficLevel {
  if (index >= 75) return 'Gridlock';
  if (index >= 55) return 'Heavy';
  if (index >= 35) return 'Moderate';
  return 'Light';
}

/**
 * How much bad weather raises traffic/collision likelihood.
 * 0 = clear; rain ~0.5-1.1; snow/ice ~1.2+.
 */
export function weatherTrafficBias(w: WeatherSnapshot | null): number {
  if (!w) return 0;
  let b = 0;
  if (w.precipitationMm > 0.2) b += 0.6;
  const c = w.weatherCode;
  if (c >= 71 && c <= 77) b += 1.2; // snow
  else if (c >= 85 && c <= 86) b += 1.2; // snow showers
  else if (c >= 95) b += 0.8; // thunderstorm
  else if (c >= 61) b += 0.5; // rain
  else if (c >= 45 && c <= 48) b += 0.4; // fog
  return b;
}

/** Base traffic index for the hour, amplified by the weather bias. */
export function trafficIndexFor(hour: number, bias: number, rng: () => number): number {
  const rush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  const midday = hour >= 10 && hour <= 15;
  const evening = hour >= 20 && hour <= 21;
  const night = hour >= 22 || hour <= 5;
  let base = 30;
  if (rush) base = 68;
  else if (midday) base = 42;
  else if (evening) base = 34;
  else if (night) base = 14;
  const noise = (rng() - 0.5) * 8;
  return clampIndex(base + bias * 22 + noise);
}

/** Short annotation describing the current weather's traffic contribution. */
export function weatherImpactTag(bias: number): string {
  if (bias <= 0) return '';
  return ` · weather +${Math.round(bias * 40)}%`;
}

export interface WeatherImpact {
  bias: number;
  trafficPct: number;
  collisionPct: number;
  label: string;
}

export function describeWeatherImpact(w: WeatherSnapshot | null): WeatherImpact {
  const bias = weatherTrafficBias(w);
  const trafficPct = Math.round(bias * 40);
  const collisionPct = Math.round(bias * 30);
  let label: string;
  if (!w) {
    label = 'Weather unavailable';
  } else if (bias <= 0) {
    label = `${describeWeatherCode(w.weatherCode).label} — normal traffic`;
  } else {
    label = `${describeWeatherCode(w.weatherCode).label} — +${trafficPct}% congestion, +${collisionPct}% collision calls`;
  }
  return { bias, trafficPct, collisionPct, label };
}
