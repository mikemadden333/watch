/* ============================================================
   Breaking-news reader — SERVER ONLY.
   The "answer the phone call" surface. A parent calls because they saw
   something on the news; this reads the live local-news intelligence
   (source "Local news (RSS)") the localnews cron has clustered and
   geocoded, and returns it near-campus-first with HONEST labels.

   Integrity rules carried straight through to the UI:
     · corroboration is a fact (distinct outlet count), shown plainly.
     · geoConfidence decides how we talk about location:
         block        → "0.3 mi NE of Englewood Prep" (precise)
         neighborhood → "in Englewood — near several campuses" (coarse)
         city         → "location not yet pinned"
     · nothing here is CONFIRMED, and coarse items never claim a ring.
   ============================================================ */

import { getServiceClient } from "./supabase";
import { distanceMi, bearing } from "./geo";
import { fmtCentral } from "./time";
import type { Campus, Tier } from "./types";

export type NewsGeo = "block" | "neighborhood" | "city";

export interface BreakingItem {
  id: string;
  headline: string;
  kind: string;
  tier: Tier; // CORROBORATED | REPORTED — never CONFIRMED
  outlets: string[];
  geo: NewsGeo;
  /** precise-only: nearest campus + distance + bearing */
  nearestCampusCode?: string;
  nearestCampusName?: string;
  distanceMi?: number;
  bearing?: string;
  /** coarse-only: the neighborhood name lifted from the headline */
  placeLabel?: string;
  /** block-level coordinates, so a single-campus view can re-measure to itself */
  lat?: number;
  lon?: number;
  firstSeen?: string;
  lastSeen?: string;
  note?: string;
}

export interface BreakingNews {
  slug: string;
  items: BreakingItem[];
  outletsLive: number; // distinct outlets seen across items
  updatedLabel?: string;
}

const RECENT_H = 18; // a breaking-news window; older news isn't "breaking"

export async function getBreakingNews(slug: string): Promise<BreakingNews | null> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return null;
  }
  const { data: tenant } = await sb.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (!tenant) return null;
  const tid = tenant.id as string;

  const sinceIso = new Date(Date.now() - RECENT_H * 3600 * 1000).toISOString();
  const [campusRes, newsRes] = await Promise.all([
    sb.from("campuses").select("*").eq("tenant_id", tid),
    sb
      .from("incidents")
      .select("*")
      .eq("tenant_id", tid)
      .eq("source", "Local news (RSS)")
      .gte("published_at", sinceIso)
      .order("published_at", { ascending: false })
      .limit(40),
  ]);

  const campuses = (campusRes.data ?? []) as unknown as (Campus & Record<string, unknown>)[];
  const outletSet = new Set<string>();
  const items: BreakingItem[] = (newsRes.data ?? []).map((r) => {
    const geo = (String(r.geo_confidence ?? "city") as NewsGeo);
    const outlets = Array.isArray(r.corroborating) ? (r.corroborating as string[]) : [];
    outlets.forEach((o) => outletSet.add(o));

    const item: BreakingItem = {
      id: String(r.id),
      headline: String(r.headline ?? ""),
      kind: String(r.kind ?? ""),
      tier: String(r.tier) as Tier,
      outlets,
      geo,
      firstSeen: r.occurred_at ? String(r.occurred_at) : undefined,
      lastSeen: r.published_at ? String(r.published_at) : undefined,
      note: r.note ? String(r.note) : undefined,
    };

    const lat = r.lat != null ? Number(r.lat) : NaN;
    const lon = r.lon != null ? Number(r.lon) : NaN;

    if (geo === "block" && !Number.isNaN(lat) && !Number.isNaN(lon)) {
      item.lat = lat;
      item.lon = lon;
    }

    if (geo === "block" && !Number.isNaN(lat) && !Number.isNaN(lon) && campuses.length) {
      // precise: measure to the nearest campus
      let best: (Campus & Record<string, unknown>) | null = null;
      let bestMi = Infinity;
      for (const c of campuses) {
        const d = distanceMi({ lat, lon }, { lat: Number(c.lat), lon: Number(c.lon) });
        if (d < bestMi) {
          bestMi = d;
          best = c;
        }
      }
      if (best) {
        item.nearestCampusCode = String(best.code);
        item.nearestCampusName = String(best.name);
        item.distanceMi = Math.round(bestMi * 100) / 100;
        item.bearing = bearing({ lat: Number(best.lat), lon: Number(best.lon) }, { lat, lon });
      }
    } else if (geo === "neighborhood") {
      // coarse: no distance claim; lift the place name from the headline tail
      const m = item.headline.match(/·\s*([^·]+?)\s*·\s*\d+\s*outlets?$/) || item.headline.match(/·\s*([^·]+)$/);
      item.placeLabel = m ? m[1].trim() : undefined;
    }
    return item;
  });

  // near-campus-first: precise blocks by distance, then neighborhood, then city
  items.sort((a, b) => rank(a) - rank(b));

  return {
    slug,
    items,
    outletsLive: outletSet.size,
    updatedLabel: items[0]?.lastSeen ? fmt(items[0].lastSeen) : undefined,
  };
}

function rank(i: BreakingItem): number {
  if (i.geo === "block") return (i.distanceMi ?? 99);
  if (i.geo === "neighborhood") return 100;
  return 200;
}

function fmt(iso: string): string {
  return fmtCentral(iso);
}
