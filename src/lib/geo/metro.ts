/* ============================================================
   Metro bounds — the cities Watch actually serves.
   Watch is a school-network tool for a specific city; it should not
   surface violent-crime news from other metros just because a local
   feed happened to carry it (e.g. a regional wire running an Indiana
   or suburban story). A news incident must resolve to a point INSIDE
   the served metro to be shown; anything we can't place inside the
   city is dropped, not guessed at.

   Boxes are intentionally city-tight (a little generous at the edges
   to include immediately-adjacent served areas). Extend per network.
   ============================================================ */

import type { CityKey } from "../news/extract";

export interface MetroBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const METRO: Record<CityKey, MetroBox> = {
  // Chicago proper + immediate edge
  chicago: { latMin: 41.60, latMax: 42.05, lonMin: -87.95, lonMax: -87.50 },
  // Dallas proper + immediate edge
  dallas: { latMin: 32.55, latMax: 33.05, lonMin: -97.05, lonMax: -96.55 },
};

export function inMetro(city: CityKey, lat: number, lon: number): boolean {
  const b = METRO[city];
  if (!b) return true; // unknown city → don't over-filter
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}
