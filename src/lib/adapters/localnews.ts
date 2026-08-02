/* ============================================================
   Local-news intelligence adapter
   The honest version of "watch the local stations." Pipeline:

     RSS feeds (ABC7/NBC5/WGN/FOX32/WTTW/Block Club/CWB …)
       → extract   (is it violent? what kind? any location cue?)
       → cluster    (same event across outlets → corroboration count)
       → geocode    (block cue → Census point; else neighborhood centroid)
       → NormalizedIncident carrying tier + geoConfidence

   Why this matters (the product's own words): "sometimes all a principal
   has is someone calling because they saw breaking news." This is that
   call, structured — with corroboration scored and geo confidence graded
   so we can be useful WITHOUT overstating what we know.

   Integrity contract enforced here:
     · tier is CORROBORATED (2+ outlets) or REPORTED (1) — NEVER CONFIRMED.
     · geoConfidence 'block'  → precise, ring-eligible in the rules engine.
       geoConfidence 'neighborhood' → coarse centroid, briefing context only,
       structurally barred from any distance-ring rule (see rules.ts gate).
     · a single outlet never pages; coarse geo never maps or rings.
   ============================================================ */

import type { AdapterResult, NormalizedIncident, GeoConfidence } from "./contract";
import { fetchCityHeadlines } from "./rss";
import { clusterHeadlines, type NewsCluster } from "../news/cluster";
import { geocodeOneline } from "./geocode";
import type { EventType } from "../news/extract";

const KIND: Record<EventType, string> = {
  homicide: "homicide",
  shooting: "shooting",
  stabbing: "stabbing",
  robbery: "robbery",
  violent: "violent",
};

const EVENT_LABEL: Record<EventType, string> = {
  homicide: "Reported homicide",
  shooting: "Reported shooting",
  stabbing: "Reported stabbing",
  robbery: "Reported armed robbery",
  violent: "Reported violent incident",
};

/** Cap Census geocodes per run to stay a good citizen of a free service. */
const MAX_GEOCODES = 12;

/** Cities the intelligence layer is tuned for. Extraction hardcodes a
 *  "Chicago, IL" geocode suffix and a Chicago neighborhood gazetteer, so
 *  running it on another city would geocode headlines to the WRONG place —
 *  an integrity failure. Until a Dallas gazetteer/suffix ships, other cities
 *  fetch feeds for health but emit no located incidents. (Dallas already has
 *  live PD dispatch, a stronger signal than clustered news.) */
const TUNED = new Set(["chicago"]);

export async function runLocalNewsAdapter(city: string): Promise<AdapterResult> {
  const { headlines, health, liveFeeds, totalFeeds, errors } = await fetchCityHeadlines(city);

  if (!TUNED.has(city.toLowerCase())) {
    return {
      source: "Local-news intelligence",
      fetched: headlines.length,
      incidents: [],
      weatherSignals: [],
      health: { ...health, ageLabel: `${liveFeeds}/${totalFeeds} feeds · not tuned for ${city}` },
      errors,
    };
  }

  const clusters = clusterHeadlines(headlines);

  const incidents: NormalizedIncident[] = [];
  let geocodes = 0;

  for (const c of clusters) {
    let lat: number | undefined;
    let lon: number | undefined;
    let geoConfidence: GeoConfidence;

    if (c.blockCue && geocodes < MAX_GEOCODES) {
      geocodes++;
      const g = await geocodeOneline(c.blockCue);
      if (g) {
        lat = g.lat;
        lon = g.lon;
        geoConfidence = "block"; // precise: ring-eligible
      } else if (c.place) {
        lat = c.place.lat;
        lon = c.place.lon;
        geoConfidence = "neighborhood"; // block failed to geocode; fall back coarse
      } else {
        geoConfidence = "city";
      }
    } else if (c.place) {
      lat = c.place.lat;
      lon = c.place.lon;
      geoConfidence = "neighborhood"; // coarse centroid: context only, never a ring
    } else if (c.blockCue) {
      // had a block cue but hit the geocode cap this run — no coordinates yet;
      // carry the query so a later run can place it. Coarse until then.
      geoConfidence = "city";
    } else {
      geoConfidence = "city";
    }

    incidents.push({
      source: "Local news (RSS)",
      sourceRecordId: recordId(c),
      headline: headlineFor(c),
      kind: KIND[c.eventType],
      tier: c.tier, // CORROBORATED | REPORTED — never CONFIRMED
      lat,
      lon,
      occurredAt: c.firstSeen,
      publishedAt: c.lastSeen ?? c.firstSeen,
      corroborating: c.outlets,
      geocodeQuery: c.blockCue ?? undefined,
      geoConfidence,
      note: noteFor(c, geoConfidence),
    });
  }

  return {
    source: "Local-news intelligence",
    fetched: headlines.length,
    incidents,
    weatherSignals: [],
    health: {
      ...health,
      ageLabel: `${liveFeeds}/${totalFeeds} feeds · ${clusters.length} events`,
    },
    errors,
  };
}

/** Idempotent per event per day: same location+type reported again just
 *  refreshes the row (and its outlet list) rather than duplicating. */
function recordId(c: NewsCluster): string {
  const day = (c.firstSeen ?? "").slice(0, 10);
  return `localnews:${c.key}:${day}`;
}

function headlineFor(c: NewsCluster): string {
  const where = c.blockCue
    ? c.blockCue.replace(/, Chicago, IL$/, "")
    : c.place
      ? c.place.name
      : "location unspecified";
  const corr = c.outlets.length >= 2 ? ` · ${c.outlets.length} outlets` : " · single outlet";
  return `Breaking news · ${EVENT_LABEL[c.eventType]} · ${where}${corr}`;
}

function noteFor(c: NewsCluster, geo: GeoConfidence): string {
  const parts: string[] = [];
  parts.push(c.tier === "CORROBORATED" ? `${c.outlets.length} independent outlets` : "single outlet — unconfirmed");
  parts.push(
    geo === "block"
      ? "block-level location"
      : geo === "neighborhood"
        ? "neighborhood-level location (coarse — context only, no ring)"
        : "no precise location"
  );
  parts.push("news signal · never confirmed by an authority");
  return parts.join(" · ");
}
