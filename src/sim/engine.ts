import { createRng } from '../game';
import { haversineKm, moveToward } from './geo';
import { HOTSPOTS, STATIONS } from './stations';
import {
  CORRIDORS,
  trafficIndexFor,
  trafficLevelLabel,
  weatherImpactTag,
} from './traffic';
import type {
  AmbientCar,
  Incident,
  IncidentCategory,
  SimState,
  Unit,
  UnitType,
} from './types';

const UNIT_SPEED_KMH = 55;
const MAX_ACTIVE_INCIDENTS = 40;
const BASE_INCIDENTS_PER_HOUR = 5;

// --- Ambient traffic (Section 1: traffic as a gameplay system) ---
const MAX_AMBIENT = 42; // performance cap on visible ambient vehicles
const AMBIENT_SPEED_KMH = 32;
const YIELD_KM = 0.5; // cars within this range of a responding unit pull over
const CAR_CRASH_PER_HOUR = 0.9; // base ambient crash rate, amplified by congestion

const DMV_BOUNDS = { minLat: 38.7, maxLat: 39.05, minLon: -77.4, maxLon: -76.8 };

/** Travel-speed multiplier from the regional traffic index (1 = clear, ~0.45 = gridlock). */
export function congestionFactor(trafficIndex: number): number {
  return Math.max(0.45, 1 - 0.55 * (trafficIndex / 100));
}

/** Whether a car should yield (pull over) for a nearby responding unit. */
export function carYields(
  car: { lat: number; lon: number },
  unitPositions: { lat: number; lon: number }[],
  km: number = YIELD_KM,
): boolean {
  for (const p of unitPositions) {
    if (haversineKm({ lat: car.lat, lon: car.lon }, p) <= km) return true;
  }
  return false;
}

const STATION_POS: Record<string, { lat: number; lon: number }> = Object.fromEntries(
  STATIONS.map((s) => [s.id, { lat: s.lat, lon: s.lon }]),
);

const REQUIRED_TYPE: Record<IncidentCategory, UnitType> = {
  medical: 'ems',
  fire: 'fire',
  crime: 'police',
  traffic: 'police',
  hazmat: 'fire',
};

const ON_SCENE_MINUTES: Record<IncidentCategory, number> = {
  medical: 10,
  fire: 22,
  crime: 14,
  traffic: 16,
  hazmat: 28,
};

const DETAILS: Record<IncidentCategory, string[]> = {
  medical: ['62M · chest pain', '28F · trouble breathing', '45M · unconscious', 'Child · allergic reaction', '70F · fall, hip pain'],
  fire: ['Smoke showing, 2nd floor', 'Working fire, occupants out', 'Alarm activation', 'Vehicle fully involved', 'Odor of smoke in structure'],
  crime: ['Suspect fled on foot', 'Weapon reported', 'Victim on scene', 'In progress, caller hiding', 'Two parties fighting'],
  traffic: ['2 vehicles, injuries', 'Rollover, 1 trapped', 'Pedestrian struck, serious', 'Multi-vehicle, lanes blocked', 'Vehicle vs guardrail'],
  hazmat: ['Unknown odor, evacuating', 'Fuel leak spreading', 'Chemical smell reported', 'Container leaking'],
};

function pickDetail(category: IncidentCategory, rng: () => number): string {
  const arr = DETAILS[category];
  return arr[Math.floor(rng() * arr.length)];
}

const LABELS: Record<IncidentCategory, string[]> = {
  medical: ['Cardiac arrest', 'Fall injury', 'Difficulty breathing', 'Stroke symptoms', 'Overdose'],
  fire: ['Structure fire', 'Kitchen fire', 'Vehicle fire', 'Electrical fire', 'Smoke investigation'],
  crime: ['Robbery in progress', 'Assault', 'Domestic disturbance', 'Burglary', 'Suspicious person'],
  traffic: ['Vehicle collision', 'Rollover crash', 'Pedestrian struck', 'Multi-car pileup', 'Disabled vehicle'],
  hazmat: ['Chemical spill', 'Natural gas leak', 'Unknown substance', 'Fuel spill'],
};

export interface TickContext {
  rng: () => number;
  /** 0 = clear; higher values raise traffic-incident likelihood (bad weather). */
  trafficBias?: number;
  autoDispatch?: boolean;
}

function pickWeighted<T>(rng: () => number, items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function createInitialState(seed = 1): SimState {
  const units: Unit[] = [];
  let fireN = 1;
  let medicN = 1;
  let policeN = 1;

  for (const s of STATIONS) {
    if (s.kind === 'fire') {
      units.push({ id: `u-e${fireN}`, callSign: `E${fireN}`, type: 'fire', homeId: s.id, lat: s.lat, lon: s.lon, status: 'available', assignedIncidentId: null });
      units.push({ id: `u-m${medicN}`, callSign: `M${medicN}`, type: 'ems', homeId: s.id, lat: s.lat, lon: s.lon, status: 'available', assignedIncidentId: null });
      fireN += 1;
      medicN += 1;
    } else if (s.kind === 'police') {
      for (let k = 0; k < 2; k++) {
        units.push({ id: `u-p${policeN}`, callSign: `P${policeN}`, type: 'police', homeId: s.id, lat: s.lat, lon: s.lon, status: 'available', assignedIncidentId: null });
        policeN += 1;
      }
    }
  }

  const rng = createRng(seed);
  const ambient: AmbientCar[] = Array.from({ length: MAX_AMBIENT }, (_, i) => makeCar(i + 1, rng));

  return {
    minutes: 8 * 60,
    units,
    incidents: [],
    nextIncidentId: 1,
    resolvedCount: 0,
    log: [],
    trafficIndex: 40,
    trafficLog: [],
    ambient,
    nextCarId: MAX_AMBIENT + 1,
  };
}

function categoryWeights(hour: number, trafficBias: number): { value: IncidentCategory; weight: number }[] {
  const rush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  const night = hour >= 22 || hour <= 5;
  return [
    { value: 'medical', weight: 3 },
    { value: 'fire', weight: 1 },
    { value: 'crime', weight: night ? 3.3 : 1.5 },
    { value: 'traffic', weight: (rush ? 5 : 2) * (night ? 0.6 : 1) * (1 + trafficBias) },
    { value: 'hazmat', weight: 0.4 },
  ];
}

/** Build a pending incident of a given category at a location (mutates nextIncidentId). */
function buildIncident(
  state: SimState,
  category: IncidentCategory,
  lat: number,
  lon: number,
  rng: () => number,
): Incident {
  const priority = pickWeighted<1 | 2 | 3>(rng, [
    { value: 1, weight: 2 },
    { value: 2, weight: 4.5 },
    { value: 3, weight: 3.5 },
  ]);
  const labels = LABELS[category];
  const id = `INC-${String(state.nextIncidentId).padStart(4, '0')}`;
  state.nextIncidentId += 1;
  return {
    id,
    category,
    label: labels[Math.floor(rng() * labels.length)],
    priority,
    lat,
    lon,
    createdMin: state.minutes,
    status: 'pending',
    requiredType: REQUIRED_TYPE[category],
    onSceneRemaining: ON_SCENE_MINUTES[category],
    assignedUnitId: null,
    detail: pickDetail(category, rng),
  };
}

function spawnIncident(state: SimState, rng: () => number, trafficBias: number): Incident {
  const hotspot = pickWeighted(
    rng,
    HOTSPOTS.map((h) => ({ value: h, weight: h.weight })),
  );
  const category = pickWeighted(rng, categoryWeights(Math.floor((state.minutes / 60) % 24), trafficBias));
  return buildIncident(
    state,
    category,
    hotspot.lat + (rng() - 0.5) * 0.04,
    hotspot.lon + (rng() - 0.5) * 0.04,
    rng,
  );
}

function randInBounds(rng: () => number): { lat: number; lon: number } {
  return {
    lat: DMV_BOUNDS.minLat + rng() * (DMV_BOUNDS.maxLat - DMV_BOUNDS.minLat),
    lon: DMV_BOUNDS.minLon + rng() * (DMV_BOUNDS.maxLon - DMV_BOUNDS.minLon),
  };
}

function makeCar(id: number, rng: () => number): AmbientCar {
  const p = randInBounds(rng);
  const t = randInBounds(rng);
  return { id: `car-${id}`, lat: p.lat, lon: p.lon, targetLat: t.lat, targetLon: t.lon, yielding: false };
}

function nearestAvailable(units: Unit[], incident: Incident): Unit | null {
  let best: Unit | null = null;
  let bestDist = Infinity;
  for (const u of units) {
    if (u.status !== 'available' || u.type !== incident.requiredType) continue;
    const d = haversineKm({ lat: u.lat, lon: u.lon }, { lat: incident.lat, lon: incident.lon });
    if (d < bestDist) {
      bestDist = d;
      best = u;
    }
  }
  return best;
}

function assign(unit: Unit, incident: Incident, log: string[], minutes: number): void {
  unit.status = 'enroute';
  unit.assignedIncidentId = incident.id;
  incident.status = 'assigned';
  incident.assignedUnitId = unit.id;
  log.unshift(`${fmtClock(minutes)}  ${unit.callSign} dispatched to ${incident.id} (${incident.label})`);
}

export function fmtClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Advance the simulation by `dtMin` sim-minutes, returning a new state. */
export function tick(state: SimState, dtMin: number, ctx: TickContext): SimState {
  const rng = ctx.rng;
  const trafficBias = ctx.trafficBias ?? 0;
  const autoDispatch = ctx.autoDispatch ?? true;

  const units = state.units.map((u) => ({ ...u }));
  const incidents = state.incidents.map((i) => ({ ...i }));
  const incidentById = new Map(incidents.map((i) => [i.id, i]));
  const log = state.log.slice(0, 60);
  const minutes = state.minutes + dtMin;
  let nextIncidentId = state.nextIncidentId;
  let resolvedCount = state.resolvedCount;

  const working: SimState = { ...state, minutes, incidents, nextIncidentId, units };

  // 1. Spawn new incidents.
  let expected = BASE_INCIDENTS_PER_HOUR * (dtMin / 60);
  while (expected > 0 && working.incidents.filter((i) => i.status !== 'resolved').length < MAX_ACTIVE_INCIDENTS) {
    if (expected >= 1 || rng() < expected) {
      const inc = spawnIncident(working, rng, trafficBias);
      working.incidents.push(inc);
      incidentById.set(inc.id, inc);
      log.unshift(`${fmtClock(minutes)}  911: ${inc.label} — ${inc.id} (P${inc.priority})`);
    }
    expected -= 1;
  }
  nextIncidentId = working.nextIncidentId;

  // Regional traffic index up front — it drives both congestion and reporting.
  const hour = Math.floor((minutes / 60) % 24);
  const trafficIndex = trafficIndexFor(hour, trafficBias, rng);
  const cong = congestionFactor(trafficIndex);

  // Congestion slows emergency units.
  const kmThisTick = UNIT_SPEED_KMH * (dtMin / 60) * cong;

  // 2. Advance each unit.
  for (const u of units) {
    if (u.status === 'enroute') {
      const inc = u.assignedIncidentId ? incidentById.get(u.assignedIncidentId) : undefined;
      if (!inc || inc.status === 'resolved') {
        u.status = 'returning';
        u.assignedIncidentId = null;
        continue;
      }
      const res = moveToward({ lat: u.lat, lon: u.lon }, { lat: inc.lat, lon: inc.lon }, kmThisTick);
      u.lat = res.position.lat;
      u.lon = res.position.lon;
      if (res.arrived) {
        u.status = 'onscene';
        inc.status = 'onscene';
        log.unshift(`${fmtClock(minutes)}  ${u.callSign} on scene at ${inc.id}`);
      }
    } else if (u.status === 'onscene') {
      const inc = u.assignedIncidentId ? incidentById.get(u.assignedIncidentId) : undefined;
      if (!inc) {
        u.status = 'returning';
        u.assignedIncidentId = null;
        continue;
      }
      inc.onSceneRemaining -= dtMin;
      if (inc.onSceneRemaining <= 0) {
        inc.status = 'resolved';
        resolvedCount += 1;
        u.status = 'returning';
        u.assignedIncidentId = null;
        log.unshift(`${fmtClock(minutes)}  ${inc.id} cleared by ${u.callSign}`);
      }
    } else if (u.status === 'returning') {
      const home = STATION_POS[u.homeId];
      const res = moveToward({ lat: u.lat, lon: u.lon }, home, kmThisTick);
      u.lat = res.position.lat;
      u.lon = res.position.lon;
      if (res.arrived) u.status = 'available';
    }
  }

  // 2b. Ambient traffic: move cars, yield to responding units, occasional crashes.
  const respondingPositions = units
    .filter((u) => u.status === 'enroute' || u.status === 'onscene')
    .map((u) => ({ lat: u.lat, lon: u.lon }));
  const carKm = AMBIENT_SPEED_KMH * (dtMin / 60) * cong;
  let ambient = state.ambient.map((c) => ({ ...c }));
  for (const car of ambient) {
    car.yielding = carYields(car, respondingPositions);
    if (car.yielding) continue; // pulled over for the siren
    const res = moveToward(
      { lat: car.lat, lon: car.lon },
      { lat: car.targetLat, lon: car.targetLon },
      carKm,
    );
    car.lat = res.position.lat;
    car.lon = res.position.lon;
    if (res.arrived) {
      const t = randInBounds(rng);
      car.targetLat = t.lat;
      car.targetLon = t.lon;
    }
  }

  // Ambient crashes become real MVA (traffic) incidents — more likely in congestion.
  let nextCarId = state.nextCarId;
  const crashExpected = CAR_CRASH_PER_HOUR * (dtMin / 60) * (0.5 + trafficIndex / 100);
  if (
    rng() < crashExpected &&
    ambient.length > 0 &&
    working.incidents.filter((i) => i.status !== 'resolved').length < MAX_ACTIVE_INCIDENTS
  ) {
    const idx = Math.floor(rng() * ambient.length);
    const crashed = ambient[idx];
    ambient = ambient.filter((_, i) => i !== idx);
    const inc = buildIncident(working, 'traffic', crashed.lat, crashed.lon, rng);
    working.incidents.push(inc);
    incidentById.set(inc.id, inc);
    nextIncidentId = working.nextIncidentId;
    log.unshift(`${fmtClock(minutes)}  🚗💥 MVA reported — ${inc.id} (P${inc.priority})`);
  }

  // Keep the ambient pool topped up to the cap.
  while (ambient.length < MAX_AMBIENT) {
    ambient.push(makeCar(nextCarId, rng));
    nextCarId += 1;
  }

  // 3. Auto-dispatch pending incidents (highest priority, oldest first).
  if (autoDispatch) {
    const pending = working.incidents
      .filter((i) => i.status === 'pending')
      .sort((a, b) => a.priority - b.priority || a.createdMin - b.createdMin);
    for (const inc of pending) {
      const unit = nearestAvailable(units, inc);
      if (unit) assign(unit, inc, log, minutes);
    }
  }

  // 4b. Traffic model: emit corridor congestion reports from the index above.
  const trafficLog = state.trafficLog.slice(0, 60);
  const reportChance = Math.min(0.85, dtMin / 16);
  if (rng() < reportChance) {
    const corridor = CORRIDORS[Math.floor(rng() * CORRIDORS.length)];
    const localIndex = Math.max(0, Math.min(100, trafficIndex + (rng() - 0.5) * 22));
    const level = trafficLevelLabel(localIndex);
    trafficLog.unshift(
      `${fmtClock(minutes)}  🚗 ${level} on ${corridor.name}${weatherImpactTag(trafficBias)}`,
    );
  }

  // Drop long-resolved incidents to keep the list manageable.
  const trimmedIncidents = working.incidents.filter(
    (i) => i.status !== 'resolved' || minutes - i.createdMin < 90,
  );

  return {
    minutes,
    units,
    incidents: trimmedIncidents,
    nextIncidentId,
    resolvedCount,
    log: log.slice(0, 60),
    trafficIndex,
    trafficLog: trafficLog.slice(0, 60),
    ambient,
    nextCarId,
  };
}

/** Manually dispatch the nearest available unit to a specific incident. */
export function dispatchIncident(state: SimState, incidentId: string): SimState {
  const units = state.units.map((u) => ({ ...u }));
  const incidents = state.incidents.map((i) => ({ ...i }));
  const inc = incidents.find((i) => i.id === incidentId);
  if (!inc || inc.status !== 'pending') return state;
  const unit = nearestAvailable(units, inc);
  if (!unit) return state;
  const log = state.log.slice();
  assign(unit, inc, log, state.minutes);
  return { ...state, units, incidents, log: log.slice(0, 60) };
}

/** Add a player-reported incident at a specific location, returning new state. */
export function addIncidentAt(
  state: SimState,
  lat: number,
  lon: number,
  rng: () => number,
): SimState {
  const hour = Math.floor((state.minutes / 60) % 24);
  const category = pickWeighted(rng, categoryWeights(hour, 0));
  const working = { ...state, nextIncidentId: state.nextIncidentId };
  const incident = buildIncident(working, category, lat, lon, rng);
  const log = [
    `${fmtClock(state.minutes)}  911: ${incident.label} — ${incident.id} (P${incident.priority})`,
    ...state.log,
  ];
  return {
    ...state,
    incidents: [...state.incidents, incident],
    nextIncidentId: working.nextIncidentId,
    log: log.slice(0, 60),
  };
}

/** Convenience for wiring a seeded RNG into ticks. */
export function makeRng(seed: number): () => number {
  return createRng(seed);
}
