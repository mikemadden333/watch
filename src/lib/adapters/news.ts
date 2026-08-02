/* ============================================================
   Licensed news adapter — NewsAPI.org-shaped (KEY-GATED)
   OFF until NEWSAPI_KEY is set. A licensed feed is required because
   Watch republishes/derives alerts from it — commercial-use terms are
   load-bearing, not optional. Minutes behind publication. Like GDELT,
   news is CORROBORATED-tier at best and headline-level (coarse geo).
   ============================================================ */

import type { AdapterResult, NormalizedIncident } from "./contract";

interface NewsArticle {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
}

/** Is the licensed-news source contracted (key present)? */
export function newsContracted(): boolean {
  return !!process.env.NEWSAPI_KEY;
}

export async function runNewsAdapter(city: string, pageSize = 15): Promise<AdapterResult> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    // dark slot — advertised in the UI as "OFF · not contracted"
    return {
      source: "News (licensed)",
      fetched: 0,
      incidents: [],
      weatherSignals: [],
      health: {
        key: "news",
        label: "News (licensed)",
        ageLabel: "OFF · not contracted",
        expectedWindow: "≤60m window",
        inWindow: false,
        state: "warn",
      },
      errors: [],
    };
  }

  const errors: string[] = [];
  let articles: NewsArticle[] = [];
  const q = encodeURIComponent(`("${city}") AND (shooting OR shots OR homicide OR stabbing)`);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=${pageSize}`;
  try {
    const res = await fetch(url, { headers: { "X-Api-Key": key }, cache: "no-store" });
    if (!res.ok) {
      errors.push(`NewsAPI ${res.status}`);
    } else {
      const body = (await res.json()) as { articles?: NewsArticle[] };
      articles = body.articles ?? [];
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const seen = new Set<string>();
  const incidents: NormalizedIncident[] = [];
  for (const a of articles) {
    if (!a.url || !a.title || seen.has(a.url)) continue;
    seen.add(a.url);
    incidents.push({
      source: `News · ${a.source?.name ?? "licensed"}`,
      sourceRecordId: `news:${a.url}`,
      headline: `News · ${a.title.slice(0, 120)}`,
      kind: /homicide|killed|fatal/i.test(a.title) ? "homicide" : "shooting",
      tier: "CORROBORATED", // licensed outlet — corroborates, never confirms
      occurredAt: a.publishedAt,
      publishedAt: a.publishedAt,
      note: "Licensed news · headline-level · network scope",
    });
  }

  return {
    source: "News (licensed)",
    fetched: articles.length,
    incidents,
    weatherSignals: [],
    health: (() => {
      const failed = errors.length > 0 && incidents.length === 0;
      return {
        key: "news",
        label: "News (licensed)",
        ageLabel: failed ? "unreachable" : incidents.length ? "live" : "no coverage",
        expectedWindow: "≤60m window",
        inWindow: !failed,
        state: failed ? "warn" : "ok",
      };
    })(),
    errors,
  };
}
