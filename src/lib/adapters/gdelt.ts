/* ============================================================
   GDELT adapter — api.gdeltproject.org DOC 2.0 (free, no key)
   Open, commercially clean. Indexes global news at the article
   level and geolocates by content, NOT by precise coordinates — so
   GDELT items are network-scope REPORTED signals (single source,
   headline-level). They corroborate a located signal (Citizen /
   dispatch); they never confirm and never trigger a ring rule alone.

   GDELT asks for ≤1 request / 5 s; the adapter throttles and
   degrades gracefully on 429.
   ============================================================ */

import type { AdapterResult, NormalizedIncident } from "./contract";

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const VIOLENCE = "(shooting OR shot OR homicide OR \"shots fired\" OR stabbing)";

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string; // YYYYMMDDTHHMMSSZ
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

function classify(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("homicide") || t.includes("killed") || t.includes("fatal")) return "homicide";
  if (t.includes("stab")) return "stabbing";
  return "shooting";
}

function parseSeen(s?: string): string | undefined {
  if (!s || s.length < 15) return undefined;
  // 20260801T214700Z -> 2026-08-01T21:47:00Z
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
}

export async function runGdeltAdapter(
  city: string,
  maxRecords = 15
): Promise<AdapterResult> {
  const errors: string[] = [];
  let articles: GdeltArticle[] = [];
  let rateLimited = false;

  const query = `${VIOLENCE} "${city}" sourcecountry:US`;
  const url = `${BASE}?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxRecords}&timespan=24h&sort=datedesc&format=json`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Watch/1.0 (ops@example.com)" },
      cache: "no-store",
    });
    if (res.status === 429) {
      rateLimited = true;
    } else if (!res.ok) {
      errors.push(`GDELT ${res.status}`);
    } else {
      const text = await res.text();
      try {
        const body = JSON.parse(text) as { articles?: GdeltArticle[] };
        articles = body.articles ?? [];
      } catch {
        // GDELT occasionally returns non-JSON (throttle notice / malformed)
        if (/limit requests/i.test(text)) rateLimited = true;
        else errors.push("GDELT non-JSON response");
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // dedupe by url; emit REPORTED, network-scope (no coordinates)
  const seen = new Set<string>();
  const incidents: NormalizedIncident[] = [];
  for (const a of articles) {
    if (!a.url || !a.title) continue;
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    incidents.push({
      source: `GDELT · ${a.domain ?? "news wire"}`,
      sourceRecordId: `gdelt:${a.url}`,
      headline: `News · ${a.title.slice(0, 120)}`,
      kind: classify(a.title),
      tier: "REPORTED", // single-source, headline-level — never confirms, never on the map
      occurredAt: parseSeen(a.seendate),
      publishedAt: parseSeen(a.seendate),
      note: "GDELT news wire · headline-level · network scope",
    });
  }

  return {
    source: "GDELT news wire",
    fetched: articles.length,
    incidents,
    weatherSignals: [],
    health: {
      key: "gdelt",
      label: "GDELT",
      ageLabel: rateLimited ? "throttled" : incidents.length ? "live" : "no coverage",
      expectedWindow: "≤90m window",
      inWindow: !rateLimited,
      state: rateLimited ? "warn" : "ok",
    },
    errors,
  };
}
