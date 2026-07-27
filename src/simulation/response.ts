import type { WeatherSnapshot } from '../weather/openMeteo';

export type ResponseLevel = 'low' | 'moderate' | 'high';

export interface ResponseMetric {
  key: string;
  label: string;
  emoji: string;
  /** 0-100 index. */
  value: number;
  level: ResponseLevel;
  detail: string;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function levelFor(value: number): ResponseLevel {
  if (value >= 66) return 'high';
  if (value >= 33) return 'moderate';
  return 'low';
}

/**
 * Energy demand rises when it's cold (heating) or hot (cooling); wind adds a
 * wind-chill heating penalty. Comfortable temps (~18-24C) keep demand low.
 */
export function energyDemand(w: Pick<WeatherSnapshot, 'tempC' | 'windKmh'>): ResponseMetric {
  const heatingDegrees = Math.max(0, 18 - w.tempC);
  const coolingDegrees = Math.max(0, w.tempC - 24);
  const value = clamp(20 + heatingDegrees * 3 + coolingDegrees * 4 + w.windKmh * 0.2);
  const driver =
    heatingDegrees > coolingDegrees ? 'heating load' : coolingDegrees > 0 ? 'cooling load' : 'baseline load';
  return {
    key: 'energy',
    label: 'Energy demand',
    emoji: '⚡',
    value,
    level: levelFor(value),
    detail: `Driven by ${driver} at ${w.tempC}°C.`,
  };
}

/**
 * Irrigation need rises with heat-driven evapotranspiration and wind, and falls
 * with recent precipitation.
 */
export function irrigationNeed(
  w: Pick<WeatherSnapshot, 'tempC' | 'precipitationMm' | 'windKmh'>,
): ResponseMetric {
  const evapotranspiration = Math.max(0, w.tempC - 5) * 2 + w.windKmh * 0.4;
  const value = clamp(evapotranspiration - w.precipitationMm * 8);
  return {
    key: 'irrigation',
    label: 'Irrigation need',
    emoji: '🌾',
    value,
    level: levelFor(value),
    detail:
      w.precipitationMm > 0
        ? `${w.precipitationMm}mm rain offsets crop water demand.`
        : 'No rainfall to offset crop water demand.',
  };
}

/**
 * Traffic risk rises with precipitation, strong wind, and hazardous conditions
 * (snow, fog, thunderstorms) inferred from the weather code.
 */
export function trafficRisk(
  w: Pick<WeatherSnapshot, 'precipitationMm' | 'windKmh' | 'weatherCode'>,
): ResponseMetric {
  let codeRisk = 0;
  const c = w.weatherCode;
  if (c >= 45 && c <= 48) codeRisk = 25; // fog
  else if (c >= 71 && c <= 77) codeRisk = 40; // snow
  else if (c >= 85 && c <= 86) codeRisk = 45; // snow showers
  else if (c >= 95) codeRisk = 45; // thunderstorm
  else if (c >= 61) codeRisk = 15; // rain

  const value = clamp(w.precipitationMm * 10 + w.windKmh * 0.8 + codeRisk);
  return {
    key: 'traffic',
    label: 'Traffic risk',
    emoji: '🚗',
    value,
    level: levelFor(value),
    detail: codeRisk >= 40 ? 'Hazardous conditions on the roads.' : 'Wind and rain affect road safety.',
  };
}

/** Run all response/impact simulations for a weather snapshot. */
export function simulateResponses(w: WeatherSnapshot): ResponseMetric[] {
  return [energyDemand(w), irrigationNeed(w), trafficRisk(w)];
}
