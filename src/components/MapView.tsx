import { forwardRef, lazy, Suspense } from 'react';
import MapLibreMapView from './MapLibreMapView';
import { MAPBOX_TOKEN, type GameMapRef, type MapViewProps } from './mapTypes';

// mapbox-gl is only loaded when a token is configured, keeping it out of the
// default (keyless) bundle path.
const MapboxMapView = lazy(() => import('./MapboxMapView'));

const MapView = forwardRef<GameMapRef, MapViewProps>(function MapView(props, ref) {
  if (MAPBOX_TOKEN) {
    return (
      <Suspense fallback={<div className="map-loading">Loading map…</div>}>
        <MapboxMapView ref={ref} {...props} />
      </Suspense>
    );
  }
  return <MapLibreMapView ref={ref} {...props} />;
});

export default MapView;
