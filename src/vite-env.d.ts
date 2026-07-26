interface ImportMetaEnv {
  /** Optional Mapbox access token; when set, the map switches to Mapbox GL. */
  readonly VITE_MAPBOX_TOKEN?: string;
  /** Optional custom MapLibre/Mapbox style URL override. */
  readonly VITE_MAP_STYLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
