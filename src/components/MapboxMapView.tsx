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

// Mapbox's modern 3D style; override with VITE_MAP_STYLE if desired.
const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/standard';

const MapboxMapView = forwardRef<GameMapRef, MapViewProps>(function MapboxMapView(
  { marker, onSelect },
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
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ longitude: 10, latitude: 25, zoom: 1.4 }}
      mapStyle={STYLE_OVERRIDE ?? DEFAULT_MAPBOX_STYLE}
      projection={{ name: 'globe' }}
      onClick={(e: MapMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng)}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {marker && (
        <Marker
          longitude={marker.longitude}
          latitude={marker.latitude}
          color="#e0501f"
          anchor="bottom"
        />
      )}
    </Map>
  );
});

export default MapboxMapView;
