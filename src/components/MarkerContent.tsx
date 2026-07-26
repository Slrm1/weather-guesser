import type { MapMarker } from './mapTypes';

export function MarkerContent({ marker }: { marker: MapMarker }) {
  return (
    <span
      className={`map-marker marker-${marker.kind}${marker.pulse ? ' pulse' : ''}`}
      style={{ background: marker.color }}
      title={marker.title}
    >
      {marker.emoji}
    </span>
  );
}
