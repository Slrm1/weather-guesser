import { forwardRef, useImperativeHandle, useRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE_OVERRIDE, type GameMapRef, type MapViewProps } from './mapTypes';
import { MarkerContent } from './MarkerContent';

// OpenFreeMap "liberty" is keyless and ships a `building-3d` extrusion layer,
// so buildings render in 3D when tilted and zoomed in.
const KEYLESS_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const DEFAULT_VIEW = { longitude: -77.04, latitude: 38.9, zoom: 9.6, pitch: 55, bearing: -18 };

interface MapLibreMap {
  getSource: (id: string) => unknown;
  addSource: (id: string, src: unknown) => void;
  setTerrain: (t: unknown) => void;
  setSky: (s: unknown) => void;
  once?: (ev: string, cb: () => void) => void;
  triggerRepaint?: () => void;
}

function enable3D(map: MapLibreMap) {
  try {
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      });
    }
    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.3 });
  } catch {
    /* terrain unsupported — keep the flat map */
  }
  try {
    map.setSky({
      'sky-color': '#8fc0ee',
      'sky-horizon-blend': 0.6,
      'horizon-color': '#eaf3fb',
      'horizon-fog-blend': 0.6,
      'fog-color': '#dfeaf5',
      'fog-ground-blend': 0.4,
    });
  } catch {
    /* sky unsupported */
  }
}

const MapLibreMapView = forwardRef<GameMapRef, MapViewProps>(function MapLibreMapView(
  { markers, initialView, onSelect },
  ref,
) {
  const mapRef = useRef<MapRef>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (opts) =>
      mapRef.current?.flyTo({
        center: opts.center,
        zoom: opts.zoom,
        duration: opts.duration,
      }),
  }));

  const view = initialView ?? DEFAULT_VIEW;

  return (
    <Map
      ref={mapRef}
      // Construct already tilted; the render loop is kicked below so it paints in 3D.
      initialViewState={view}
      maxPitch={80}
      mapStyle={STYLE_OVERRIDE ?? KEYLESS_STYLE}
      onLoad={(e) => {
        const map = e.target as unknown as MapLibreMap;
        enable3D(map);
        map.once?.('idle', () => map.triggerRepaint?.());
      }}
      onClick={
        onSelect ? (e: MapLayerMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng) : undefined
      }
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="top-right" visualizePitch />
      {markers.map((m) => (
        <Marker key={m.id} longitude={m.longitude} latitude={m.latitude} anchor="center">
          <MarkerContent marker={m} />
        </Marker>
      ))}
    </Map>
  );
});

export default MapLibreMapView;
