export type UnitType = 'fire' | 'ems' | 'police';

export type IncidentCategory = 'medical' | 'fire' | 'crime' | 'traffic' | 'hazmat';

export type StationKind = 'fire' | 'ems' | 'police' | 'hospital';

export interface Station {
  id: string;
  name: string;
  kind: StationKind;
  jurisdiction: string;
  lat: number;
  lon: number;
}

export type UnitStatus = 'available' | 'enroute' | 'onscene' | 'returning';

export interface Unit {
  id: string;
  callSign: string;
  type: UnitType;
  homeId: string;
  lat: number;
  lon: number;
  status: UnitStatus;
  assignedIncidentId: string | null;
}

export type IncidentStatus = 'pending' | 'assigned' | 'onscene' | 'resolved';

export interface Incident {
  id: string;
  category: IncidentCategory;
  label: string;
  priority: 1 | 2 | 3;
  lat: number;
  lon: number;
  createdMin: number;
  status: IncidentStatus;
  requiredType: UnitType;
  onSceneRemaining: number;
  assignedUnitId: string | null;
  detail: string;
}

export interface SimState {
  minutes: number;
  units: Unit[];
  incidents: Incident[];
  nextIncidentId: number;
  resolvedCount: number;
  log: string[];
  trafficIndex: number;
  trafficLog: string[];
}
