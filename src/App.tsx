import { useCallback, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView';
import type { GameMapRef } from './components/mapTypes';
import SimulationPanel from './components/SimulationPanel';
import ForecastStrip from './components/ForecastStrip';
import { pickRandomCity } from './game';
import { simulateResponses } from './simulation/response';
import {
  describeWeatherCode,
  fetchWeather,
  geocodeCity,
  type GeoResult,
  type WeatherSnapshot,
} from './weather/openMeteo';

type Phase = 'idle' | 'loading' | 'loaded';

interface Selection {
  latitude: number;
  longitude: number;
  label: string;
}

export default function App() {
  const mapRef = useRef<GameMapRef>(null);
  const requestId = useRef(0);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const flyTo = useCallback((latitude: number, longitude: number, zoom = 6) => {
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom, duration: 1400 });
  }, []);

  const loadLocation = useCallback(
    async (latitude: number, longitude: number, label: string) => {
      const id = ++requestId.current;
      setSelection({ latitude, longitude, label });
      setWeather(null);
      setPhase('loading');
      const w = await fetchWeather(latitude, longitude);
      if (id !== requestId.current) return; // a newer selection superseded this one
      setWeather(w);
      setPhase('loaded');
    },
    [],
  );

  const onMapSelect = useCallback(
    (latitude: number, longitude: number) => {
      void loadLocation(
        latitude,
        longitude,
        `Pinned location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      );
    },
    [loadLocation],
  );

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await geocodeCity(query.trim());
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(r: GeoResult) {
    setResults([]);
    setQuery('');
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    flyTo(r.latitude, r.longitude);
    void loadLocation(r.latitude, r.longitude, label);
  }

  function surpriseMe() {
    const city = pickRandomCity();
    flyTo(city.latitude, city.longitude);
    void loadLocation(city.latitude, city.longitude, `${city.emoji} ${city.name}, ${city.country}`);
  }

  const responses = useMemo(
    () => (weather ? simulateResponses(weather) : []),
    [weather],
  );
  const condition = weather ? describeWeatherCode(weather.weatherCode) : null;

  return (
    <div className="page">
      <header className="header">
        <h1>🌍 Weather Predictor</h1>
        <p className="subtitle">
          Pick a spot on the map to see its live conditions and 5-day forecast,
          plus how that weather ripples through simulated systems.
        </p>
      </header>

      <main className="layout">
        <section className="map-pane" aria-label="map">
          <MapView ref={mapRef} marker={selection} onSelect={onMapSelect} />
        </section>

        <aside className="panel">
          <form className="search" onSubmit={runSearch}>
            <input
              type="text"
              placeholder="Search a city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search a city"
            />
            <button type="submit" className="secondary" disabled={searching}>
              {searching ? '…' : 'Search'}
            </button>
            <button type="button" className="secondary" onClick={surpriseMe}>
              Surprise me
            </button>
          </form>

          {results.length > 0 && (
            <ul className="results" data-testid="search-results">
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button type="button" onClick={() => chooseResult(r)}>
                    {[r.name, r.admin1, r.country].filter(Boolean).join(', ')}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {phase === 'idle' && (
            <p className="hint" data-testid="hint">
              Click anywhere on the map, search a city, or hit “Surprise me” to
              get a forecast.
            </p>
          )}

          {phase === 'loading' && <p className="hint">Loading forecast…</p>}

          {phase === 'loaded' && selection && weather && condition && (
            <section className="forecast-panel" aria-label="forecast" data-testid="forecast-panel">
              <h2 className="location">{selection.label}</h2>

              <div className="current">
                <span className="current-emoji" aria-hidden="true">{condition.emoji}</span>
                <div className="current-main">
                  <span className="current-temp" data-testid="current-temp">
                    {weather.tempC}°C
                  </span>
                  <span className="current-cond">{condition.label}</span>
                </div>
              </div>
              <p className="meta">
                Feels like {weather.apparentTempC}°C · wind {weather.windKmh} km/h
                · precip {weather.precipitationMm} mm
              </p>
              <p className={`source source-${weather.source}`}>
                {weather.source === 'live'
                  ? 'Live forecast from Open-Meteo'
                  : 'Offline simulated forecast (API unreachable)'}
              </p>

              <ForecastStrip daily={weather.daily} />
              <SimulationPanel metrics={responses} />

              <button
                type="button"
                className="primary"
                onClick={() => {
                  setPhase('idle');
                  setSelection(null);
                  setWeather(null);
                  // Return the map to the initial global overview.
                  mapRef.current?.flyTo({ center: [10, 25], zoom: 1.4, duration: 1200 });
                }}
              >
                Clear
              </button>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
