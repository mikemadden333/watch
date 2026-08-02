/* ============================================================
   Geocoding — US Census onelineaddress (free, no key, public domain).
   Turns Dallas PD "block + location" into coordinates so dispatch
   calls can be measured against campus rings. Cached per process;
   failures cache as null so we don't hammer a bad address.
   ============================================================ */

import type { NormalizedIncident } from "./contract";

const cache = new Map<string, { lat: number; lon: number } | null>();

export async function geocodeOneline(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  if (cache.has(address)) return cache.get(address)!;
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      cache.set(address, null);
      return null;
    }
    const d = (await res.json()) as {
      result?: { addressMatches?: { coordinates?: { x: number; y: number } }[] };
    };
    const c = d.result?.addressMatches?.[0]?.coordinates;
    const r = c ? { lat: c.y, lon: c.x } : null;
    cache.set(address, r);
    return r;
  } catch {
    cache.set(address, null);
    return null;
  }
}

/** Fill lat/lon on incidents that carry a geocodeQuery but no coordinates.
 *  Bounded to `max` distinct addresses per run to respect the geocoder. */
export async function geocodePending(
  incidents: NormalizedIncident[],
  max = 25
): Promise<{ geocoded: number }> {
  let geocoded = 0;
  let attempts = 0;
  for (const inc of incidents) {
    if (inc.lat != null && inc.lon != null) continue;
    if (!inc.geocodeQuery) continue;
    if (attempts >= max && !cache.has(inc.geocodeQuery)) continue;
    attempts++;
    const g = await geocodeOneline(inc.geocodeQuery);
    if (g) {
      inc.lat = g.lat;
      inc.lon = g.lon;
      geocoded++;
    }
  }
  return { geocoded };
}
