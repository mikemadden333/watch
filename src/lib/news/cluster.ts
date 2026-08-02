/* ============================================================
   News clustering — turn many outlet headlines into few events.
   Pure and testable. Given extracted items from several newsrooms,
   group the ones describing the SAME real-world incident, then score
   corroboration by counting DISTINCT outlets.

   Integrity contract:
     · 2+ distinct outlets on one event → CORROBORATED
     · 1 outlet                         → REPORTED
     · news is NEVER CONFIRMED — only an authoritative source confirms.
   Clustering is deliberately conservative: a false merge would inflate
   corroboration, so we only merge on a shared, specific location cue
   (same block, or same neighborhood + same event type) within a time
   window. When in doubt, we leave items apart (under-count, never over).
   ============================================================ */

import { extract, type EventType, type Extracted } from "./extract";
import type { Place } from "./gazetteer";

export interface RawHeadline {
  outlet: string; // distinct-outlet key ("ABC7 Chicago")
  title: string;
  summary?: string;
  url: string;
  publishedAt?: string; // ISO
}

export interface NewsCluster {
  /** stable id derived from the strongest location cue + event type */
  key: string;
  eventType: EventType;
  /** block cue to geocode, if any member carried one (precise) */
  blockCue: string | null;
  /** named neighborhood, if any member carried one (coarse) */
  place: Place | null;
  /** distinct outlets — the corroboration count */
  outlets: string[];
  /** every member headline, newest first */
  members: Array<{ outlet: string; title: string; url: string; publishedAt?: string }>;
  /** earliest / latest publish across members (the corroboration window) */
  firstSeen?: string;
  lastSeen?: string;
  /** spread in minutes between first and last outlet (M-1 window input) */
  spreadMin: number;
  tier: "CORROBORATED" | "REPORTED";
}

const WINDOW_MS = 6 * 60 * 60 * 1000; // events within 6h can be the same story

function ms(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Two items are the same event when their location cues match AND the
 *  event types are compatible AND they fall inside the time window.
 *  Location match precedence: same block cue > same neighborhood. Without
 *  a shared, specific location we do NOT merge (token overlap alone is too
 *  loose — two unrelated Englewood shootings must stay separate). */
function sameEvent(a: Candidate, b: Candidate): boolean {
  if (a.ex.eventType !== b.ex.eventType) {
    // allow homicide/shooting to co-cluster (a shooting reported later as fatal)
    const pair = new Set([a.ex.eventType, b.ex.eventType]);
    if (!(pair.has("shooting") && pair.has("homicide"))) return false;
  }
  const ta = ms(a.raw.publishedAt);
  const tb = ms(b.raw.publishedAt);
  if (ta != null && tb != null && Math.abs(ta - tb) > WINDOW_MS) return false;

  // same block → same event (strongest, precise cue)
  if (a.ex.blockCue && b.ex.blockCue) {
    return normLoc(a.ex.blockCue) === normLoc(b.ex.blockCue);
  }
  // same neighborhood → same event (coarse, but paired with same event type)
  if (a.ex.place && b.ex.place) {
    return a.ex.place.name === b.ex.place.name;
  }
  // one has a block, the other only a neighborhood: merge only if the block
  // sits in that neighborhood is unknowable here → stay conservative, no merge
  return false;
}

/** Canonicalize a location string so "6300 block of South Halsted" and
 *  "6300 block of S Halsted" collapse to the same key: expand directional
 *  words to letters, drop street-type suffixes and the city tail, strip
 *  punctuation. Conservative — only affects tokens we know are equivalent. */
function normLoc(s: string): string {
  return s
    .toLowerCase()
    .replace(/,?\s*chicago,?\s*il\b/g, "")
    .replace(/\b(north|south|east|west)\b/g, (m) => m[0])
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|place|pl)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

interface Candidate {
  raw: RawHeadline;
  ex: Extracted;
}

/** Cluster a batch of raw headlines into corroboration-scored events.
 *  Non-violent or location-less items are dropped (network-scope noise is
 *  handled elsewhere; clustering is only for locatable violent events). */
export function clusterHeadlines(raw: RawHeadline[]): NewsCluster[] {
  const cands: Candidate[] = [];
  for (const r of raw) {
    const ex = extract(r.title, r.summary);
    if (!ex.isViolent || !ex.eventType) continue;
    // must have SOME location to be clusterable/placeable
    if (!ex.blockCue && !ex.place) continue;
    cands.push({ raw: r, ex });
  }

  const groups: Candidate[][] = [];
  for (const c of cands) {
    let placed = false;
    for (const g of groups) {
      if (g.some((m) => sameEvent(m, c))) {
        g.push(c);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([c]);
  }

  return groups.map(toCluster).sort((a, b) => b.outlets.length - a.outlets.length);
}

function toCluster(group: Candidate[]): NewsCluster {
  // distinct outlets — the corroboration count (dedupe same outlet twice)
  const outlets = [...new Set(group.map((c) => c.raw.outlet))];

  // strongest location cue across members
  const block = group.map((c) => c.ex.blockCue).find(Boolean) ?? null;
  const place = group.map((c) => c.ex.place).find(Boolean) ?? null;

  // pick the dominant event type; homicide outranks shooting when both present
  const types = group.map((c) => c.ex.eventType!) as EventType[];
  const eventType: EventType = types.includes("homicide") ? "homicide" : types[0];

  const times = group.map((c) => ms(c.raw.publishedAt)).filter((t): t is number => t != null);
  const firstMs = times.length ? Math.min(...times) : null;
  const lastMs = times.length ? Math.max(...times) : null;
  const spreadMin = firstMs != null && lastMs != null ? Math.round((lastMs - firstMs) / 60000) : 0;

  const members = [...group]
    .sort((a, b) => (ms(b.raw.publishedAt) ?? 0) - (ms(a.raw.publishedAt) ?? 0))
    .map((c) => ({ outlet: c.raw.outlet, title: c.raw.title, url: c.raw.url, publishedAt: c.raw.publishedAt }));

  const locKey = block ? normLoc(block) : place ? place.name.toLowerCase().replace(/\s+/g, "") : "unknown";
  const key = `${eventType}:${locKey}`;

  return {
    key,
    eventType,
    blockCue: block,
    place,
    outlets,
    members,
    firstSeen: firstMs != null ? new Date(firstMs).toISOString() : undefined,
    lastSeen: lastMs != null ? new Date(lastMs).toISOString() : undefined,
    spreadMin,
    tier: outlets.length >= 2 ? "CORROBORATED" : "REPORTED",
  };
}
