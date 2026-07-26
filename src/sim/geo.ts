export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in kilometres. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface MoveResult {
  position: LatLon;
  arrived: boolean;
}

/**
 * Move `from` toward `to` by at most `maxKm`. Uses a linear interpolation in
 * lat/lon, which is accurate enough over the short (city-scale) distances here.
 */
export function moveToward(from: LatLon, to: LatLon, maxKm: number): MoveResult {
  const dist = haversineKm(from, to);
  if (dist <= maxKm || dist === 0) {
    return { position: { lat: to.lat, lon: to.lon }, arrived: true };
  }
  const f = maxKm / dist;
  return {
    position: {
      lat: from.lat + (to.lat - from.lat) * f,
      lon: from.lon + (to.lon - from.lon) * f,
    },
    arrived: false,
  };
}
