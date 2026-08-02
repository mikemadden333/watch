/* Chicago neighborhood / community-area centroids. Used to give a
   headline a *neighborhood-level* location when it names a place but no
   cross-street. Coordinates are approximate centroids — which is exactly
   why anything resolved here is tagged geoConfidence 'neighborhood' and
   is NEVER allowed to trigger a ring rule. Honest coarseness. */

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

// Focused on the pilot's south/west/central footprint; extend per network.
export const CHICAGO_PLACES: Place[] = [
  { name: "Englewood", lat: 41.7796, lon: -87.6444 },
  { name: "West Englewood", lat: 41.7773, lon: -87.6669 },
  { name: "Woodlawn", lat: 41.7799, lon: -87.5967 },
  { name: "Hyde Park", lat: 41.7943, lon: -87.5907 },
  { name: "Bronzeville", lat: 41.8127, lon: -87.6187 },
  { name: "Washington Park", lat: 41.7934, lon: -87.6169 },
  { name: "Greater Grand Crossing", lat: 41.7625, lon: -87.6155 },
  { name: "Grand Crossing", lat: 41.7625, lon: -87.6155 },
  { name: "Auburn Gresham", lat: 41.7434, lon: -87.6539 },
  { name: "Chatham", lat: 41.7403, lon: -87.6113 },
  { name: "South Shore", lat: 41.7606, lon: -87.5750 },
  { name: "Roseland", lat: 41.7008, lon: -87.6215 },
  { name: "Englewood Square", lat: 41.7796, lon: -87.6444 },
  { name: "Back of the Yards", lat: 41.8090, lon: -87.6667 },
  { name: "Gage Park", lat: 41.7951, lon: -87.6957 },
  { name: "Little Village", lat: 41.8386, lon: -87.7017 },
  { name: "North Lawndale", lat: 41.8583, lon: -87.7175 },
  { name: "Austin", lat: 41.8916, lon: -87.7648 },
  { name: "Garfield Park", lat: 41.8862, lon: -87.7266 },
  { name: "East Garfield Park", lat: 41.8809, lon: -87.7038 },
  { name: "West Garfield Park", lat: 41.8801, lon: -87.7295 },
  { name: "Humboldt Park", lat: 41.9022, lon: -87.7017 },
  { name: "Lawndale", lat: 41.8446, lon: -87.7166 },
  { name: "Pilsen", lat: 41.8570, lon: -87.6559 },
  { name: "Bridgeport", lat: 41.8380, lon: -87.6505 },
  { name: "Chicago Lawn", lat: 41.7752, lon: -87.6957 },
  { name: "West Pullman", lat: 41.6785, lon: -87.6339 },
  { name: "Pullman", lat: 41.7075, lon: -87.6090 },
  { name: "Kenwood", lat: 41.8098, lon: -87.5970 },
  { name: "Grand Boulevard", lat: 41.8127, lon: -87.6187 },
  { name: "Douglas", lat: 41.8346, lon: -87.6186 },
  { name: "Fuller Park", lat: 41.8090, lon: -87.6323 },
  { name: "New City", lat: 41.8090, lon: -87.6560 },
  { name: "The Loop", lat: 41.8786, lon: -87.6300 },
  { name: "Near West Side", lat: 41.8709, lon: -87.6667 },
  { name: "Uptown", lat: 41.9660, lon: -87.6553 },
  { name: "Rogers Park", lat: 42.0090, lon: -87.6690 },
];

/** Generic finder — longest-name-first so "West Englewood" beats
 *  "Englewood". City-agnostic: pass whichever gazetteer applies. */
export function findPlaceIn(places: Place[], text: string): Place | null {
  const byLen = [...places].sort((a, b) => b.name.length - a.name.length);
  const t = text.toLowerCase();
  for (const p of byLen) {
    // word-boundary match to avoid partial hits
    const re = new RegExp(`\\b${p.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(t)) return p;
  }
  return null;
}

/** Chicago convenience wrapper (back-compat). */
export function findPlace(text: string): Place | null {
  return findPlaceIn(CHICAGO_PLACES, text);
}
