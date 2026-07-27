import type { MapMarker } from './mapTypes';

export function MarkerContent({ marker }: { marker: MapMarker }) {
  const cls = [
    'map-marker',
    `marker-${marker.kind}`,
    marker.pulse ? 'pulse' : '',
    marker.flashing ? 'flashing' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} style={{ background: marker.color }} title={marker.title}>
      {marker.emoji}
    </span>
  );
}
