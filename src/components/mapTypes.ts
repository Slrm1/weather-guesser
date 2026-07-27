export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  emoji: string;
  color: string;
  kind: 'station' | 'unit' | 'incident' | 'car';
  title?: string;
  pulse?: boolean;
  /** Responding units flash red/blue emergency lights. */
  flashing?: boolean;
}

export interface MapInitialView {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapViewProps {
  markers: MapMarker[];
  initialView?: MapInitialView;
  onSelect?: (latitude: number, longitude: number) => void;
}

export interface FlyToOptions {
  center: [number, number];
  zoom?: number;
  duration?: number;
}

/** Minimal imperative handle shared by the Mapbox and MapLibre map components. */
export interface GameMapRef {
  flyTo: (opts: FlyToOptions) => void;
  /** Animate the camera pitch/bearing (used by the 3D/2D toggle). */
  setTilt: (pitch: number, bearing: number) => void;
}

/** When a Mapbox token is provided, the app renders Mapbox GL instead of MapLibre. */
export const MAPBOX_TOKEN: string | undefined =
  import.meta.env.VITE_MAPBOX_TOKEN || undefined;

/** Optional style override applied to whichever provider is active. */
export const STYLE_OVERRIDE: string | undefined =
  import.meta.env.VITE_MAP_STYLE || undefined;
