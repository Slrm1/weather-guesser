import { forwardRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Free, no-key vector tiles from OpenFreeMap.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export interface MapViewProps {
  marker: { latitude: number; longitude: number } | null;
  onSelect: (latitude: number, longitude: number) => void;
}

const MapView = forwardRef<MapRef, MapViewProps>(function MapView(
  { marker, onSelect },
  ref,
) {
  return (
    <Map
      ref={ref}
      initialViewState={{ longitude: 10, latitude: 25, zoom: 1.3 }}
      mapStyle={MAP_STYLE}
      onClick={(e: MapLayerMouseEvent) => onSelect(e.lngLat.lat, e.lngLat.lng)}
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

export default MapView;
