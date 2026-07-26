import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  dispatchIncident,
  fmtClock,
  makeRng,
  tick,
} from './engine';
import type { Incident, SimState } from './types';

describe('createInitialState', () => {
  it('creates available units of every type', () => {
    const s = createInitialState();
    const types = new Set(s.units.map((u) => u.type));
    expect(types).toEqual(new Set(['fire', 'ems', 'police']));
    expect(s.units.every((u) => u.status === 'available')).toBe(true);
    expect(s.minutes).toBe(8 * 60);
    expect(s.incidents).toHaveLength(0);
  });
});

describe('fmtClock', () => {
  it('formats sim-minutes as HH:MM and wraps past midnight', () => {
    expect(fmtClock(8 * 60)).toBe('08:00');
    expect(fmtClock(13 * 60 + 5)).toBe('13:05');
    expect(fmtClock(25 * 60)).toBe('01:00');
  });
});

describe('tick', () => {
  it('spawns incidents over time and is deterministic per seed', () => {
    const run = () => {
      let s = createInitialState();
      for (let i = 0; i < 20; i++) s = tick(s, 10, { rng: makeRng(123 + i) });
      return s;
    };
    const a = run();
    const b = run();
    expect(a.incidents.length).toBeGreaterThan(0);
    expect(a.incidents.map((i) => i.id)).toEqual(b.incidents.map((i) => i.id));
  });

  it('auto-dispatches, works, and resolves incidents over time', () => {
    let s = createInitialState();
    for (let i = 0; i < 250; i++) {
      s = tick(s, 5, { rng: makeRng(7 + i) });
    }
    expect(s.resolvedCount).toBeGreaterThan(0);
    // Units should end near a valid status and some return home to available.
    expect(s.units.some((u) => u.status === 'available')).toBe(true);
  });

  it('advances the clock by dt', () => {
    const s0 = createInitialState();
    const s1 = tick(s0, 30, { rng: makeRng(1) });
    expect(s1.minutes).toBe(s0.minutes + 30);
  });
});

describe('dispatchIncident', () => {
  it('assigns the nearest available unit to a pending incident', () => {
    const base = createInitialState();
    const incident: Incident = {
      id: 'INC-TEST',
      category: 'medical',
      label: 'Test',
      priority: 1,
      lat: 38.9008,
      lon: -77.0106,
      createdMin: base.minutes,
      status: 'pending',
      requiredType: 'ems',
      onSceneRemaining: 10,
      assignedUnitId: null,
    };
    const state: SimState = { ...base, incidents: [incident] };
    const next = dispatchIncident(state, 'INC-TEST');
    const inc = next.incidents[0];
    expect(inc.status).toBe('assigned');
    expect(inc.assignedUnitId).toBeTruthy();
    const unit = next.units.find((u) => u.id === inc.assignedUnitId);
    expect(unit?.status).toBe('enroute');
    expect(unit?.type).toBe('ems');
  });
});
