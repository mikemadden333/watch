/* ============================================================
   Safe Passage — score incidents against the streets kids actually walk,
   not just a concentric ring. A corridor is a polyline (the route) with a
   buffer width; an incident whose PRECISE location falls within the buffer
   is "on the route" and matters more than one an equal distance away in the
   opposite direction.

   Corridors are account CONFIGURATION — a school defines its own Safe
   Passage routes, exactly as it sets ring radii. The paths below are
   plausible examples along real streets near each campus; a network edits
   them in admin. (This is config, never fabricated incident data.)

   Integrity: only precise incidents (geoConfidence exact/block, with
   coordinates) can be scored against a corridor. A neighborhood centroid is
   too coarse to place on a specific street — the same gate the rules engine
   uses for rings.
   ============================================================ */

import type { Incident } from "./types";

export interface Corridor {
  id: string;
  campusCode: string;
  name: string; // "Stewart Ave · north approach"
  path: [number, number][]; // [lat, lon] ordered
  bufferMi: number; // how far off the route still counts as "on it"
}

export const CORRIDORS: Record<string, Corridor[]> = {
  "veritas-charter": [
    { id: "eng-stewart", campusCode: "ENG", name: "S Stewart Ave · north approach", bufferMi: 0.09,
      path: [[41.7770, -87.6360], [41.7795, -87.6360], [41.7817, -87.6360]] },
    { id: "eng-63rd", campusCode: "ENG", name: "W 63rd St · east approach", bufferMi: 0.09,
      path: [[41.7796, -87.6300], [41.7796, -87.6335], [41.7817, -87.6360]] },
    { id: "wdl-woodlawn", campusCode: "WDL", name: "S Woodlawn Ave · south approach", bufferMi: 0.09,
      path: [[41.7745, -87.5965], [41.7765, -87.5965], [41.7785, -87.5965]] },
    { id: "hyp-kenwood", campusCode: "HYP", name: "S Kenwood Ave · corridor", bufferMi: 0.08,
      path: [[41.7970, -87.5928], [41.7994, -87.5928], [41.8018, -87.5928]] },
    { id: "brz-king", campusCode: "BRZ", name: "S King Dr · north approach", bufferMi: 0.09,
      path: [[41.8065, -87.6160], [41.8090, -87.6160], [41.8115, -87.6160]] },
    { id: "wpk-king", campusCode: "WPK", name: "S King Dr · south approach", bufferMi: 0.09,
      path: [[41.7905, -87.6170], [41.7930, -87.6170], [41.7955, -87.6170]] },
    { id: "gre-southchi", campusCode: "GRE", name: "S South Chicago Ave · corridor", bufferMi: 0.09,
      path: [[41.7605, -87.6175], [41.7625, -87.6150], [41.7645, -87.6125]] },
  ],
  "solis-academies": [
    { id: "tro-beckley", campusCode: "TRO", name: "N Beckley Ave · corridor", bufferMi: 0.09,
      path: [[32.7530, -96.8320], [32.7550, -96.8320], [32.7570, -96.8320]] },
    { id: "cvp-jefferson", campusCode: "CVP", name: "W Jefferson Blvd · corridor", bufferMi: 0.09,
      path: [[32.7430, -96.8300], [32.7430, -96.8280], [32.7430, -96.8260]] },
    { id: "sdc-malcolmx", campusCode: "SDC", name: "Malcolm X Blvd · corridor", bufferMi: 0.09,
      path: [[32.7600, -96.7720], [32.7620, -96.7720], [32.7640, -96.7720]] },
    { id: "pga-buckner", campusCode: "PGA", name: "N Buckner Blvd · corridor", bufferMi: 0.09,
      path: [[32.7825, -96.6860], [32.7845, -96.6860], [32.7865, -96.6860]] },
  ],
};

/* ---------- geometry: point → polyline distance in miles ---------- */

function toXY(p: { lat: number; lon: number }, ref: { lat: number; lon: number }) {
  const mPerDegLat = 69.0;
  const mPerDegLon = 69.0 * Math.cos((ref.lat * Math.PI) / 180);
  return { x: (p.lon - ref.lon) * mPerDegLon, y: (p.lat - ref.lat) * mPerDegLat };
}

function pointToSegMi(p: { lat: number; lon: number }, a: [number, number], b: [number, number]): number {
  const ref = { lat: a[0], lon: a[1] };
  const P = toXY(p, ref);
  const B = toXY({ lat: b[0], lon: b[1] }, ref);
  const len2 = B.x * B.x + B.y * B.y;
  let t = len2 === 0 ? 0 : (P.x * B.x + P.y * B.y) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = t * B.x;
  const cy = t * B.y;
  return Math.hypot(P.x - cx, P.y - cy);
}

export function distToCorridorMi(p: { lat: number; lon: number }, path: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) min = Math.min(min, pointToSegMi(p, path[i], path[i + 1]));
  return min;
}

/* ---------- scoring ---------- */

export interface OnRoute {
  incident: Incident;
  distMi: number; // distance from the route
}

export interface ScoredCorridor {
  corridor: Corridor;
  onRoute: OnRoute[]; // nearest first
}

/** Only precise incidents (block/exact, with coordinates) are ring/route
 *  eligible. Coarse neighborhood signals are excluded — they can't be placed
 *  on a specific street. */
function isPreciseLocated(i: Incident): boolean {
  const g = i.geoConfidence ?? "exact";
  return (g === "exact" || g === "block") && Number.isFinite(i.lat) && Number.isFinite(i.lon) && !(i.lat === 0 && i.lon === 0);
}

export function scorePassage(incidents: Incident[], corridors: Corridor[]): ScoredCorridor[] {
  const usable = incidents.filter(isPreciseLocated).filter((i) => i.kind !== "weather-advisory");
  return corridors.map((corridor) => {
    const onRoute: OnRoute[] = [];
    for (const inc of usable) {
      const d = distToCorridorMi({ lat: inc.lat, lon: inc.lon }, corridor.path);
      if (d <= corridor.bufferMi) onRoute.push({ incident: inc, distMi: Math.round(d * 100) / 100 });
    }
    onRoute.sort((a, b) => a.distMi - b.distMi);
    return { corridor, onRoute };
  });
}
