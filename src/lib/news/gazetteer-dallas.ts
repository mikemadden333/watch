/* Dallas neighborhood / area centroids, focused on the Solis Academies
   footprint — Oak Cliff, South Dallas, Pleasant Grove — plus the
   surrounding southern/central sectors a headline might name. Same honest
   coarseness rule as Chicago: anything resolved here is geoConfidence
   'neighborhood' (an approximate centroid) and NEVER triggers a ring.
   Coordinates are approximate community-area centroids. */

import type { Place } from "./gazetteer";

export const DALLAS_PLACES: Place[] = [
  // Oak Cliff sector (TRO, CVP)
  { name: "North Oak Cliff", lat: 32.7480, lon: -96.8310 },
  { name: "Oak Cliff", lat: 32.7420, lon: -96.8290 },
  { name: "Bishop Arts", lat: 32.7485, lon: -96.8300 },
  { name: "Bishop Arts District", lat: 32.7485, lon: -96.8300 },
  { name: "Kessler Park", lat: 32.7520, lon: -96.8550 },
  { name: "Kessler", lat: 32.7520, lon: -96.8550 },
  { name: "Elmwood", lat: 32.7200, lon: -96.8480 },
  { name: "Wynnewood", lat: 32.7300, lon: -96.8350 },
  { name: "Kiest Park", lat: 32.7160, lon: -96.8450 },
  { name: "Kiest", lat: 32.7160, lon: -96.8450 },
  { name: "Cockrell Hill", lat: 32.7350, lon: -96.8880 },
  { name: "Cedar Crest", lat: 32.7220, lon: -96.8000 },
  { name: "Oak Cliff Gardens", lat: 32.7100, lon: -96.8200 },
  // South Dallas sector (SDC)
  { name: "South Dallas", lat: 32.7620, lon: -96.7720 },
  { name: "Fair Park", lat: 32.7810, lon: -96.7620 },
  { name: "Bonton", lat: 32.7430, lon: -96.7560 },
  { name: "Ideal", lat: 32.7530, lon: -96.7630 },
  { name: "Wheatley Place", lat: 32.7660, lon: -96.7660 },
  { name: "Queen City", lat: 32.7570, lon: -96.7520 },
  { name: "The Cedars", lat: 32.7700, lon: -96.7920 },
  { name: "Cedars", lat: 32.7700, lon: -96.7920 },
  // Pleasant Grove sector (PGA)
  { name: "Pleasant Grove", lat: 32.7480, lon: -96.6720 },
  { name: "Buckner Terrace", lat: 32.7660, lon: -96.7000 },
  { name: "Buckner", lat: 32.7660, lon: -96.7000 },
  { name: "Piedmont", lat: 32.7760, lon: -96.6900 },
  // West / central / north-adjacent
  { name: "West Dallas", lat: 32.7780, lon: -96.8720 },
  { name: "Trinity Groves", lat: 32.7800, lon: -96.8600 },
  { name: "Deep Ellum", lat: 32.7840, lon: -96.7830 },
  { name: "Downtown Dallas", lat: 32.7800, lon: -96.7970 },
  { name: "Uptown", lat: 32.7960, lon: -96.8020 },
  { name: "Old East Dallas", lat: 32.8000, lon: -96.7700 },
  { name: "East Dallas", lat: 32.8060, lon: -96.7550 },
  { name: "Lakewood", lat: 32.8120, lon: -96.7520 },
  { name: "Oak Lawn", lat: 32.8110, lon: -96.8100 },
  { name: "Lake Highlands", lat: 32.8700, lon: -96.7200 },
];
