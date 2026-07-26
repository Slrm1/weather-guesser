import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView';
import type { MapMarker } from './components/mapTypes';
import {
  addIncidentAt,
  createInitialState,
  dispatchIncident,
  fmtClock,
  makeRng,
  tick,
} from './sim/engine';
import { HOTSPOTS, STATIONS } from './sim/stations';
import { haversineKm } from './sim/geo';
import {
  describeWeatherImpact,
  trafficLevelLabel,
  weatherTrafficBias,
} from './sim/traffic';
import type {
  IncidentCategory,
  SimState,
  StationKind,
  Unit,
  UnitStatus,
  UnitType,
} from './sim/types';
import {
  describeWeatherCode,
  fetchWeather,
  type WeatherSnapshot,
} from './weather/openMeteo';

const DMV_VIEW = { longitude: -77.04, latitude: 38.9, zoom: 9.6, pitch: 55, bearing: -18 };

const TRAFFIC_COLOR: Record<string, string> = {
  Light: '#46b06a',
  Moderate: '#eab308',
  Heavy: '#f0820c',
  Gridlock: '#e02424',
};
const TICK_MS = 1000;
const SPEEDS = { Slow: 3, Normal: 8, Fast: 24 } as const;
type SpeedName = keyof typeof SPEEDS;

const UNIT_EMOJI: Record<UnitType, string> = { fire: '🚒', ems: '🚑', police: '🚓' };
const STATION_EMOJI: Record<StationKind, string> = { fire: '🚒', ems: '🚑', police: '🚓', hospital: '🏥' };
const CATEGORY_EMOJI: Record<IncidentCategory, string> = {
  medical: '🩺',
  fire: '🔥',
  crime: '🚨',
  traffic: '💥',
  hazmat: '☣️',
};
const PRIORITY_COLOR: Record<1 | 2 | 3, string> = { 1: '#e02424', 2: '#f0820c', 3: '#eab308' };
const UNIT_STATUS_COLOR: Record<UnitStatus, string> = {
  available: '#94a3b8',
  enroute: '#2563eb',
  onscene: '#f59e0b',
  returning: '#16a34a',
};

function nearestHotspot(lat: number, lon: number): string {
  let best = HOTSPOTS[0];
  let bestD = Infinity;
  for (const h of HOTSPOTS) {
    const d = haversineKm({ lat, lon }, { lat: h.lat, lon: h.lon });
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best.name;
}

export default function App() {
  const [sim, setSim] = useState<SimState>(() => createInitialState());
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<SpeedName>('Normal');
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  const seedRef = useRef(1);
  const trafficBias = useMemo(() => weatherTrafficBias(weather), [weather]);

  // Load current DC weather once (affects traffic-incident likelihood).
  useEffect(() => {
    let active = true;
    fetchWeather(38.9072, -77.0369)
      .then((w) => {
        if (active) setWeather(w);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // The simulation heartbeat.
  useEffect(() => {
    if (!running) return;
    const dtMin = SPEEDS[speed];
    const handle = setInterval(() => {
      seedRef.current += 1;
      setSim((s) =>
        tick(s, dtMin, {
          rng: makeRng(seedRef.current * 2654435761),
          trafficBias,
          autoDispatch,
        }),
      );
    }, TICK_MS);
    return () => clearInterval(handle);
  }, [running, speed, autoDispatch, trafficBias]);

  const activeIncidents = useMemo(
    () =>
      sim.incidents
        .filter((i) => i.status !== 'resolved')
        .sort((a, b) => a.priority - b.priority || a.createdMin - b.createdMin),
    [sim.incidents],
  );

  const available = useMemo(() => {
    const counts: Record<UnitType, number> = { fire: 0, ems: 0, police: 0 };
    for (const u of sim.units) if (u.status === 'available') counts[u.type] += 1;
    return counts;
  }, [sim.units]);

  const respondingCount = sim.units.filter((u: Unit) => u.status !== 'available').length;

  const markers: MapMarker[] = useMemo(() => {
    const stationMarkers: MapMarker[] = STATIONS.map((s) => ({
      id: `st-${s.id}`,
      latitude: s.lat,
      longitude: s.lon,
      emoji: STATION_EMOJI[s.kind],
      color: '#e2e8f0',
      kind: 'station',
      title: s.name,
    }));
    const unitMarkers: MapMarker[] = sim.units
      .filter((u) => u.status !== 'available')
      .map((u) => ({
        id: `un-${u.id}`,
        latitude: u.lat,
        longitude: u.lon,
        emoji: UNIT_EMOJI[u.type],
        color: UNIT_STATUS_COLOR[u.status],
        kind: 'unit',
        title: `${u.callSign} (${u.status})`,
      }));
    const incidentMarkers: MapMarker[] = sim.incidents
      .filter((i) => i.status !== 'resolved')
      .map((i) => ({
        id: `in-${i.id}`,
        latitude: i.lat,
        longitude: i.lon,
        emoji: CATEGORY_EMOJI[i.category],
        color: PRIORITY_COLOR[i.priority],
        kind: 'incident',
        title: `${i.id} ${i.label}`,
        pulse: i.status === 'pending' || i.status === 'assigned',
      }));
    return [...stationMarkers, ...unitMarkers, ...incidentMarkers];
  }, [sim.units, sim.incidents]);

  function handleMapClick(lat: number, lon: number) {
    seedRef.current += 1;
    setSim((s) => addIncidentAt(s, lat, lon, makeRng(seedRef.current * 40503)));
  }

  const day = Math.floor(sim.minutes / 1440) + 1;
  const condition = weather ? describeWeatherCode(weather.weatherCode) : null;
  const impact = describeWeatherImpact(weather);
  const trafficLevel = trafficLevelLabel(sim.trafficIndex);

  return (
    <div className="page">
      <header className="header">
        <h1>🚨 DMV Emergency Response</h1>
        <p className="subtitle">
          A living CAD dispatch simulation of Washington, DC, Northern Virginia,
          and Southern Maryland. Incidents emerge over time; units auto-dispatch,
          respond, and return. Click the map to report an incident.
        </p>
      </header>

      <main className="layout">
        <section className="map-pane" aria-label="map">
          <MapView markers={markers} initialView={DMV_VIEW} onSelect={handleMapClick} />
        </section>

        <aside className="panel cad">
          <div className="cad-top">
            <div className="clock" data-testid="clock">
              <span className="clock-time">{fmtClock(sim.minutes)}</span>
              <span className="clock-day">Day {day}</span>
            </div>
            {weather && condition && (
              <div className="weather-chip" title="Live DC weather (Open-Meteo)">
                <span aria-hidden="true">{condition.emoji}</span> {weather.tempC}°C
                {trafficBias > 0 && <span className="wx-warn"> · traffic risk ↑</span>}
              </div>
            )}
          </div>

          <div className="controls">
            <button
              type="button"
              className="primary"
              onClick={() => setRunning((r) => !r)}
            >
              {running ? '⏸ Pause' : '▶ Resume'}
            </button>
            <div className="speed">
              {(Object.keys(SPEEDS) as SpeedName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`secondary${speed === name ? ' active' : ''}`}
                  onClick={() => setSpeed(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoDispatch}
                onChange={(e) => setAutoDispatch(e.target.checked)}
              />
              Auto-dispatch
            </label>
          </div>

          <div className="stats" data-testid="stats">
            <div className="stat">
              <span className="stat-num">{activeIncidents.length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat">
              <span className="stat-num">{respondingCount}</span>
              <span className="stat-label">Responding</span>
            </div>
            <div className="stat">
              <span className="stat-num">{sim.resolvedCount}</span>
              <span className="stat-label">Cleared</span>
            </div>
            <div className="stat avail">
              <span className="stat-num">
                🚒{available.fire} 🚑{available.ems} 🚓{available.police}
              </span>
              <span className="stat-label">Available</span>
            </div>
          </div>

          <div className="traffic-block" data-testid="traffic">
            <div className="traffic-head">
              <span className="section-title">Regional traffic</span>
              <span className="traffic-level" style={{ color: TRAFFIC_COLOR[trafficLevel] }}>
                {trafficLevel} · {sim.trafficIndex}
              </span>
            </div>
            <div className="traffic-bar">
              <div
                className="traffic-fill"
                style={{
                  width: `${sim.trafficIndex}%`,
                  background: TRAFFIC_COLOR[trafficLevel],
                }}
                role="meter"
                aria-valuenow={sim.trafficIndex}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Regional traffic index"
              />
            </div>
            <p className={`weather-impact${impact.bias > 0 ? ' bad' : ''}`}>
              {condition ? `${condition.emoji} ` : ''}
              {impact.label}
            </p>
          </div>

          <h2 className="section-title">Active incidents</h2>
          <ul className="incident-list" data-testid="incident-list">
            {activeIncidents.length === 0 && (
              <li className="empty">No active incidents. All quiet.</li>
            )}
            {activeIncidents.map((i) => {
              const unit = i.assignedUnitId
                ? sim.units.find((u) => u.id === i.assignedUnitId)
                : null;
              return (
                <li key={i.id} className="incident">
                  <span
                    className="prio"
                    style={{ background: PRIORITY_COLOR[i.priority] }}
                    title={`Priority ${i.priority}`}
                  >
                    P{i.priority}
                  </span>
                  <div className="incident-body">
                    <div className="incident-title">
                      <span aria-hidden="true">{CATEGORY_EMOJI[i.category]}</span>{' '}
                      {i.label}
                      <span className="incident-id"> · {i.id}</span>
                    </div>
                    <div className="incident-meta">
                      {nearestHotspot(i.lat, i.lon)} ·{' '}
                      <span className={`status status-${i.status}`}>{i.status}</span>
                      {unit && ` · ${unit.callSign}`}
                    </div>
                  </div>
                  {i.status === 'pending' && (
                    <button
                      type="button"
                      className="dispatch-btn"
                      onClick={() => setSim((s) => dispatchIncident(s, i.id))}
                    >
                      Dispatch
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <h2 className="section-title">Traffic log</h2>
          <ul className="radio-log traffic-log" data-testid="traffic-log">
            {sim.trafficLog.length === 0 && <li>Monitoring corridors…</li>}
            {sim.trafficLog.slice(0, 10).map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>

          <h2 className="section-title">Radio log</h2>
          <ul className="radio-log" data-testid="radio-log">
            {sim.log.slice(0, 12).map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
