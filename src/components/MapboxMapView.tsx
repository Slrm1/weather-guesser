import { forwardRef, useImperativeHandle, useRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapMouseEvent,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MAPBOX_TOKEN,
  STYLE_OVERRIDE,
  type GameMapRef,
  type MapViewProps,
} from './mapTypes';
import { MarkerContent } from './MarkerContent';

// Mapbox's modern 3D style; override with VITE_MAP_STYLE if desired.
const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/standard';
const DEFAULT_VIEW = { longitude: -77.04, latitude: 38.9, zoom: 9.6, pitch: 55, bearing: -18 };

const MapboxMapView = forwardRef<GameMapRef, MapViewProps>(function MapboxMapView(
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
    setTilt: (pitch, bearing) =>
      (mapRef.current as unknown as {
        easeTo?: (o: { pitch: number; bearing: number; duration: number }) => void;
      })?.easeTo?.({ pitch, bearing, duration: 600 }),
  }));

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={initialView ?? DEFAULT_VIEW}
      maxPitch={80}
      mapStyle={STYLE_OVERRIDE ?? DEFAULT_MAPBOX_STYLE}
      onClick={
        onSelect ? (e: MapMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng) : undefined
      }
      style={{ width: '100%', height: '100%' }}
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

export default MapboxMapView;
