import { useCallback, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import MapView from './components/MapView';
import SimulationPanel from './components/SimulationPanel';
import ForecastStrip from './components/ForecastStrip';
import { pickRandomCity, scoreGuess } from './game';
import { simulateResponses } from './simulation/response';
import {
  describeWeatherCode,
  fetchWeather,
  geocodeCity,
  type GeoResult,
  type WeatherSnapshot,
} from './weather/openMeteo';

type Phase = 'idle' | 'loading' | 'guessing' | 'revealed';

interface Selection {
  latitude: number;
  longitude: number;
  label: string;
}

export default function App() {
  const mapRef = useRef<MapRef>(null);
  const requestId = useRef(0);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [guess, setGuess] = useState(15);
  const [lastPoints, setLastPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);

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
      setGuess(15);
      const w = await fetchWeather(latitude, longitude);
      if (id !== requestId.current) return; // a newer selection superseded this one
      setWeather(w);
      setPhase('guessing');
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

  function reveal() {
    if (!weather) return;
    const points = scoreGuess(weather.tempC, guess);
    setLastPoints(points);
    setScore((s) => s + points);
    setRounds((r) => r + 1);
    setPhase('revealed');
  }

  const responses = useMemo(
    () => (weather ? simulateResponses(weather) : []),
    [weather],
  );
  const condition = weather ? describeWeatherCode(weather.weatherCode) : null;

  return (
    <div className="page">
      <header className="header">
        <h1>🌍 Weather Guesser</h1>
        <p className="subtitle">
          Pick a spot on the map, predict its temperature, then see how live
          weather ripples through simulated systems.
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

          <div className="score" data-testid="score">
            Score: <strong>{score}</strong>
            {rounds > 0 && <span className="rounds"> · {rounds} guesses</span>}
          </div>

          {phase === 'idle' && (
            <p className="hint" data-testid="hint">
              Click anywhere on the map, search a city, or hit “Surprise me” to
              begin.
            </p>
          )}

          {phase === 'loading' && <p className="hint">Loading weather…</p>}

          {(phase === 'guessing' || phase === 'revealed') && selection && weather && (
            <section className="round" aria-label="round">
              <h2 className="location">{selection.label}</h2>

              {phase === 'guessing' && (
                <div className="controls">
                  <label htmlFor="guess" className="guess-label">
                    Predict the temperature:{' '}
                    <strong data-testid="guess-value">{guess}°C</strong>
                  </label>
                  <input
                    id="guess"
                    type="range"
                    min={-30}
                    max={50}
                    value={guess}
                    onChange={(e) => setGuess(Number(e.target.value))}
                  />
                  <button type="button" className="primary" onClick={reveal}>
                    Reveal &amp; score
                  </button>
                </div>
              )}

              {phase === 'revealed' && condition && (
                <div className="reveal" data-testid="reveal">
                  <p className="actual">
                    <span aria-hidden="true">{condition.emoji}</span> Actual:{' '}
                    <strong>{weather.tempC}°C</strong> · {condition.label}
                  </p>
                  <p className="meta">
                    Feels like {weather.apparentTempC}°C · wind {weather.windKmh}{' '}
                    km/h · precip {weather.precipitationMm} mm
                  </p>
                  <p className="points" data-testid="points">
                    You were off by {Math.abs(weather.tempC - guess)}° and earned{' '}
                    <strong>{lastPoints}</strong> points.
                  </p>
                  <p className={`source source-${weather.source}`}>
                    {weather.source === 'live'
                      ? 'Live data from Open-Meteo'
                      : 'Offline simulated data (API unreachable)'}
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
                    }}
                  >
                    Pick another location
                  </button>
                </div>
              )}
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
