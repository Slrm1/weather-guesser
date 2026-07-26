import { forwardRef, useImperativeHandle, useRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE_OVERRIDE, type GameMapRef, type MapViewProps } from './mapTypes';

// Carto "Voyager" is a polished, keyless vector style (no API token required).
const KEYLESS_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const MapLibreMapView = forwardRef<GameMapRef, MapViewProps>(function MapLibreMapView(
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
      initialViewState={{ longitude: 10, latitude: 25, zoom: 1.4 }}
      mapStyle={STYLE_OVERRIDE ?? KEYLESS_STYLE}
      onClick={(e: MapLayerMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng)}
      onLoad={(e) => {
        // MapLibre v5 supports a 3D globe projection for a more modern look.
        const map = e.target as unknown as {
          setProjection?: (p: { type: string }) => void;
        };
        try {
          map.setProjection?.({ type: 'globe' });
        } catch {
          /* projection unsupported — fall back to the default flat map */
        }
      }}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
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

export default MapLibreMapView;
