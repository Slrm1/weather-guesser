import type { Station } from './types';

/**
 * A representative set of real DMV-region public-safety facilities. Coordinates
 * are approximate (rounded), chosen to spread realistically across DC, Northern
 * Virginia, and Southern Maryland — not an exhaustive GIS import.
 */
export const STATIONS: Station[] = [
  // District of Columbia
  { id: 'dcfd-engine2', name: 'DCFD Engine 2 (Downtown)', kind: 'fire', jurisdiction: 'Washington, DC', lat: 38.9008, lon: -77.0106 },
  { id: 'dcfd-engine13', name: 'DCFD Engine 13 (SW)', kind: 'fire', jurisdiction: 'Washington, DC', lat: 38.8776, lon: -77.0164 },
  { id: 'dcfd-engine22', name: 'DCFD Engine 22 (NW)', kind: 'fire', jurisdiction: 'Washington, DC', lat: 38.9558, lon: -77.0662 },
  { id: 'mpd-hq', name: 'DC Metropolitan Police HQ', kind: 'police', jurisdiction: 'Washington, DC', lat: 38.8951, lon: -77.0246 },
  { id: 'mpd-2d', name: 'MPD Second District', kind: 'police', jurisdiction: 'Washington, DC', lat: 38.9203, lon: -77.0723 },
  { id: 'washington-hospital', name: 'MedStar Washington Hospital Center', kind: 'hospital', jurisdiction: 'Washington, DC', lat: 38.9276, lon: -77.0113 },
  { id: 'gwu-hospital', name: 'GW University Hospital', kind: 'hospital', jurisdiction: 'Washington, DC', lat: 38.901, lon: -77.0505 },

  // Northern Virginia
  { id: 'acfd-station4', name: 'Arlington County Fire Station 4', kind: 'fire', jurisdiction: 'Arlington, VA', lat: 38.8783, lon: -77.1057 },
  { id: 'afd-station203', name: 'Alexandria Fire Station 203', kind: 'fire', jurisdiction: 'Alexandria, VA', lat: 38.8048, lon: -77.0469 },
  { id: 'fcfd-mclean', name: 'Fairfax County Fire (McLean)', kind: 'fire', jurisdiction: 'McLean, VA', lat: 38.9339, lon: -77.1773 },
  { id: 'acpd-hq', name: 'Arlington County Police HQ', kind: 'police', jurisdiction: 'Arlington, VA', lat: 38.8850, lon: -77.1003 },
  { id: 'fcpd-reston', name: 'Fairfax County Police (Reston)', kind: 'police', jurisdiction: 'Reston, VA', lat: 38.9586, lon: -77.357 },
  { id: 'inova-fairfax', name: 'Inova Fairfax Hospital', kind: 'hospital', jurisdiction: 'Falls Church, VA', lat: 38.8496, lon: -77.2299 },
  { id: 'vhc-arlington', name: 'Virginia Hospital Center', kind: 'hospital', jurisdiction: 'Arlington, VA', lat: 38.8899, lon: -77.1163 },

  // Suburban Maryland
  { id: 'mcfd-silverspring', name: 'Montgomery County Fire (Silver Spring)', kind: 'fire', jurisdiction: 'Silver Spring, MD', lat: 38.9959, lon: -77.0281 },
  { id: 'mcfd-bethesda', name: 'Montgomery County Fire (Bethesda)', kind: 'fire', jurisdiction: 'Bethesda, MD', lat: 38.9847, lon: -77.0947 },
  { id: 'pgfd-hyattsville', name: "Prince George's Fire (Hyattsville)", kind: 'fire', jurisdiction: 'Hyattsville, MD', lat: 38.9559, lon: -76.9455 },
  { id: 'pgpd-largo', name: "Prince George's Police (Largo)", kind: 'police', jurisdiction: 'Largo, MD', lat: 38.8907, lon: -76.8474 },
  { id: 'mcpd-bethesda', name: 'Montgomery County Police (Bethesda)', kind: 'police', jurisdiction: 'Bethesda, MD', lat: 38.9807, lon: -77.0946 },
  { id: 'suburban-hospital', name: 'Suburban Hospital (Bethesda)', kind: 'hospital', jurisdiction: 'Bethesda, MD', lat: 38.991, lon: -77.118 },
  { id: 'pg-hospital', name: "UM Prince George's Hospital", kind: 'hospital', jurisdiction: 'Largo, MD', lat: 38.8899, lon: -76.8385 },
];

/** Population/activity hotspots used to seed incident locations across the region. */
export const HOTSPOTS: { name: string; lat: number; lon: number; weight: number }[] = [
  { name: 'Downtown DC', lat: 38.8977, lon: -77.0365, weight: 5 },
  { name: 'Georgetown', lat: 38.9097, lon: -77.0654, weight: 2 },
  { name: 'Capitol Hill', lat: 38.8899, lon: -76.9962, weight: 3 },
  { name: 'Arlington/Rosslyn', lat: 38.8955, lon: -77.0716, weight: 3 },
  { name: 'Alexandria', lat: 38.8048, lon: -77.0469, weight: 2 },
  { name: 'Tysons', lat: 38.9187, lon: -77.2311, weight: 3 },
  { name: 'Reston', lat: 38.9586, lon: -77.357, weight: 2 },
  { name: 'Bethesda', lat: 38.9847, lon: -77.0947, weight: 2 },
  { name: 'Silver Spring', lat: 38.9959, lon: -77.0281, weight: 2 },
  { name: 'College Park', lat: 38.9807, lon: -76.9369, weight: 2 },
  { name: 'Hyattsville', lat: 38.9559, lon: -76.9455, weight: 2 },
  { name: 'National Harbor', lat: 38.7845, lon: -77.0164, weight: 1 },
  { name: 'Largo', lat: 38.8907, lon: -76.8474, weight: 1 },
];
