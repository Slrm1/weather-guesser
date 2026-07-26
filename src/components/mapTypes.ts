export interface MapViewProps {
  marker: { latitude: number; longitude: number } | null;
  onSelect: (latitude: number, longitude: number) => void;
}

export interface FlyToOptions {
  center: [number, number];
  zoom?: number;
  duration?: number;
}

/** Minimal imperative handle shared by the Mapbox and MapLibre map components. */
export interface GameMapRef {
  flyTo: (opts: FlyToOptions) => void;
}

/** When a Mapbox token is provided, the app renders Mapbox GL instead of MapLibre. */
export const MAPBOX_TOKEN: string | undefined =
  import.meta.env.VITE_MAPBOX_TOKEN || undefined;

/** Optional style override applied to whichever provider is active. */
export const STYLE_OVERRIDE: string | undefined =
  import.meta.env.VITE_MAP_STYLE || undefined;
