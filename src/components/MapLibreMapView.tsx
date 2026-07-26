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

// Carto "Voyager" is a polished, keyless vector style (no API token required).
const KEYLESS_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const DEFAULT_VIEW = { longitude: -77.04, latitude: 38.9, zoom: 9.2 };

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

  return (
    <Map
      ref={mapRef}
      initialViewState={initialView ?? DEFAULT_VIEW}
      mapStyle={STYLE_OVERRIDE ?? KEYLESS_STYLE}
      onClick={
        onSelect ? (e: MapLayerMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng) : undefined
      }
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {markers.map((m) => (
        <Marker key={m.id} longitude={m.longitude} latitude={m.latitude} anchor="center">
          <MarkerContent marker={m} />
        </Marker>
      ))}
    </Map>
  );
});

export default MapLibreMapView;
