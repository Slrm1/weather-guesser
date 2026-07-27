import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView';
import type { GameMapRef, MapMarker } from './components/mapTypes';
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

// Quick-jump destinations across the DMV; flying here shows the accurate local
// street/building detail for each area.
const AREAS: { name: string; lat: number; lon: number; zoom: number }[] = [
  { name: 'DMV region', lat: 38.9, lon: -77.04, zoom: 9.6 },
  { name: 'Washington DC', lat: 38.9007, lon: -77.0365, zoom: 12.4 },
  { name: 'Arlington', lat: 38.8816, lon: -77.091, zoom: 12.6 },
  { name: 'Alexandria', lat: 38.8048, lon: -77.0469, zoom: 13 },
  { name: 'Bethesda', lat: 38.9847, lon: -77.0947, zoom: 13 },
  { name: 'Tysons', lat: 38.9187, lon: -77.2311, zoom: 13 },
  { name: 'Reston', lat: 38.9586, lon: -77.357, zoom: 12.6 },
  { name: 'Silver Spring', lat: 38.9959, lon: -77.0281, zoom: 13 },
  { name: 'College Park', lat: 38.9807, lon: -76.9369, zoom: 13 },
  { name: 'National Harbor', lat: 38.7845, lon: -77.0164, zoom: 14 },
  { name: 'Largo', lat: 38.8907, lon: -76.8474, zoom: 13 },
];

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

/** 0 (bright day) .. ~0.62 (deep night) darkness overlay by hour, with dawn/dusk ramps. */
function nightDarkness(hour: number): number {
  const peak = 0.62;
  if (hour >= 8 && hour <= 17) return 0;
  if (hour >= 21 || hour <= 4) return peak;
  if (hour > 4 && hour < 8) return peak * (1 - (hour - 4) / 4);
  return peak * ((hour - 17) / 4);
}

function dayPhase(hour: number): string {
  if (hour >= 8 && hour <= 16) return 'Day';
  if (hour > 16 && hour < 21) return 'Dusk';
  if (hour >= 21 || hour < 5) return 'Night';
  return 'Dawn';
}

/** Map a weather code to a precipitation overlay class (or null when clear). */
function weatherOverlay(code: number | undefined): 'rain' | 'snow' | 'fog' | null {
  if (code == null) return null;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (code >= 45 && code <= 48) return 'fog';
  return null;
}

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
  const [is3D, setIs3D] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  const mapRef = useRef<GameMapRef>(null);
  const seedRef = useRef(1);
  const audioRef = useRef<AudioContext | null>(null);
  const prevActiveRef = useRef(0);
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
        flashing: u.status === 'enroute' || u.status === 'onscene',
      }));
    const carMarkers: MapMarker[] = sim.ambient.map((c) => ({
      id: `car-${c.id}`,
      latitude: c.lat,
      longitude: c.lon,
      emoji: c.yielding ? '🚙' : '🚗',
      color: c.yielding ? '#f0c674' : '#cbd5e1',
      kind: 'car',
      title: c.yielding ? 'Yielding to responder' : 'Traffic',
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
    return [...carMarkers, ...stationMarkers, ...unitMarkers, ...incidentMarkers];
  }, [sim.units, sim.incidents, sim.ambient]);

  function jumpToArea(a: { lat: number; lon: number; zoom: number }) {
    mapRef.current?.flyTo({ center: [a.lon, a.lat], zoom: a.zoom, duration: 1400 });
  }

  function handleMapClick(lat: number, lon: number) {
    seedRef.current += 1;
    setSim((s) => addIncidentAt(s, lat, lon, makeRng(seedRef.current * 40503)));
  }

  const day = Math.floor(sim.minutes / 1440) + 1;
  const hour = Math.floor((sim.minutes / 60) % 24);
  const darkness = nightDarkness(hour);
  const phase = dayPhase(hour);
  const wx = weatherOverlay(weather?.weatherCode);
  const condition = weather ? describeWeatherCode(weather.weatherCode) : null;
  const impact = describeWeatherImpact(weather);
  const trafficLevel = trafficLevelLabel(sim.trafficIndex);

  // Keep the card up even after the incident clears (until the user closes it or
  // it is trimmed from the list), so it isn't a sub-second flash at high speed.
  const selected =
    selectedId != null ? sim.incidents.find((i) => i.id === selectedId) ?? null : null;
  const selectedUnit =
    selected?.assignedUnitId != null
      ? sim.units.find((u) => u.id === selected.assignedUnitId) ?? null
      : null;
  const selectedEtaMin =
    selected && selectedUnit && selected.status === 'assigned'
      ? Math.max(
          1,
          Math.round(
            (haversineKm(
              { lat: selectedUnit.lat, lon: selectedUnit.lon },
              { lat: selected.lat, lon: selected.lon },
            ) /
              55) *
              60,
          ),
        )
      : null;

  // Optional audio: a soft blip when a new incident comes in.
  useEffect(() => {
    const active = sim.incidents.filter((i) => i.status !== 'resolved').length;
    const ctx = audioRef.current;
    if (soundOn && ctx && active > prevActiveRef.current) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 900;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {
        /* audio unavailable */
      }
    }
    prevActiveRef.current = active;
  }, [sim.incidents, soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) {
          audioRef.current = audioRef.current ?? new Ctor();
          void audioRef.current.resume?.();
        }
      } catch {
        /* audio unavailable */
      }
    }
  }

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
          <MapView
            ref={mapRef}
            markers={markers}
            initialView={DMV_VIEW}
            onSelect={handleMapClick}
          />
          <button
            type="button"
            className="map-3d-toggle"
            onClick={() => {
              const next = !is3D;
              setIs3D(next);
              mapRef.current?.setTilt(next ? 55 : 0, next ? -18 : 0);
            }}
          >
            {is3D ? '2D' : '3D'}
          </button>

          <div
            className="map-night"
            style={{ background: `rgba(8,16,40,${darkness})` }}
            data-testid="night-overlay"
          />
          {wx && <div className={`map-wx wx-${wx}`} data-testid="wx-overlay" />}

          {selected && (
            <div className="incident-card" data-testid="incident-card">
              <button
                type="button"
                className="incident-card-close"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
              <div className="incident-card-title">
                <span
                  className="prio"
                  style={{ background: PRIORITY_COLOR[selected.priority] }}
                >
                  P{selected.priority}
                </span>
                <span aria-hidden="true">{CATEGORY_EMOJI[selected.category]}</span>{' '}
                {selected.label}
                <span className="incident-id"> · {selected.id}</span>
              </div>
              <p className="incident-card-detail">{selected.detail}</p>
              <p className="incident-card-meta">
                📍 {nearestHotspot(selected.lat, selected.lon)} ·{' '}
                <span className={`status status-${selected.status}`}>{selected.status}</span>
              </p>
              <p className="incident-card-meta">
                {selected.status === 'pending' && '⏳ Awaiting available unit'}
                {selected.status === 'assigned' &&
                  selectedUnit &&
                  `🚨 ${selectedUnit.callSign} responding · ETA ~${selectedEtaMin} min`}
                {selected.status === 'onscene' &&
                  selectedUnit &&
                  `✅ ${selectedUnit.callSign} on scene · clears in ${Math.max(
                    1,
                    Math.round(selected.onSceneRemaining),
                  )} min`}
                {selected.status === 'resolved' && '✔️ Incident cleared'}
              </p>
            </div>
          )}
        </section>

        <aside className="panel cad">
          <div className="cad-top">
            <div className="clock" data-testid="clock">
              <span className="clock-time">{fmtClock(sim.minutes)}</span>
              <span className="clock-day">
                Day {day} · {phase}
              </span>
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
            <button
              type="button"
              className={`secondary sound-btn${soundOn ? ' active' : ''}`}
              onClick={toggleSound}
              title="Toggle dispatch sounds"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
          </div>

          <div className="areas" data-testid="areas">
            <span className="areas-label">Jump to area</span>
            <div className="area-chips">
              {AREAS.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  className="area-chip"
                  onClick={() => jumpToArea(a)}
                >
                  {a.name}
                </button>
              ))}
            </div>
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
                <li
                  key={i.id}
                  className={`incident${selectedId === i.id ? ' selected' : ''}`}
                  onClick={() => setSelectedId(i.id)}
                >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSim((s) => dispatchIncident(s, i.id));
                      }}
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
