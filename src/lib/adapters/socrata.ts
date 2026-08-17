/* ============================================================
   Socrata (SODA) fetch helpers, shared by the Chicago and Dallas
   open-data adapters.

   CRITICAL, verified in the field: freshness MUST use an
   ordered-descending-limit-1 query. Aggregate queries (max(), count())
   can return STALE cached results — we observed max(date) running
   ~18 days behind a fresh ordered query on the same dataset. Never
   use aggregates for freshness. This helper enforces that.
   ============================================================ */

export interface SocrataHost {
  host: string; // 'data.cityofchicago.org'
  dataset: string; // 'gumc-mgzr'
}

function appToken(): Record<string, string> {
  const t = process.env.SOCRATA_APP_TOKEN;
  return t ? { "X-App-Token": t } : {};
}

/** Fetch a Socrata URL. An app token registered for one Socrata instance
 *  (e.g. data.cityofchicago.org) is rejected by another (e.g.
 *  www.dallasopendata.com) with 403 — which silently emptied the Dallas feed.
 *  Queries work without a token (just lower rate limits), so on an auth
 *  rejection we retry untokened. */
async function socrataFetch(url: string): Promise<Response> {
  const token = appToken();
  const res = await fetch(url, { headers: { ...token }, cache: "no-store" });
  if ((res.status === 403 || res.status === 401) && token["X-App-Token"]) {
    return fetch(url, { cache: "no-store" });
  }
  return res;
}

/** Freshness probe — ordered DESC, limit 1. Returns the newest value of
 *  `dateField`, or null. NEVER aggregate. */
export async function socrataFreshness(
  src: SocrataHost,
  dateField: string
): Promise<string | null> {
  const url =
    `https://${src.host}/resource/${src.dataset}.json` +
    `?$select=${encodeURIComponent(dateField)}` +
    `&$order=${encodeURIComponent(dateField)}%20DESC&$limit=1`;
  const res = await socrataFetch(url);
  if (!res.ok) throw new Error(`Socrata ${res.status} freshness ${src.dataset}`);
  const rows = (await res.json()) as Record<string, string>[];
  return rows.length ? rows[0][dateField] ?? null : null;
}

/** Fetch the most recent `limit` rows ordered by `dateField` DESC,
 *  optionally filtered with a SoQL `where` clause. */
export async function socrataRecent(
  src: SocrataHost,
  dateField: string,
  limit: number,
  where?: string
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams();
  params.set("$order", `${dateField} DESC`);
  params.set("$limit", String(limit));
  if (where) params.set("$where", where);
  const url = `https://${src.host}/resource/${src.dataset}.json?${params.toString()}`;
  const res = await socrataFetch(url);
  if (!res.ok) throw new Error(`Socrata ${res.status} recent ${src.dataset}`);
  return (await res.json()) as Record<string, unknown>[];
}

/** Age label + health state from a freshness timestamp and its expected
 *  window (in hours). Outside the window → warn/late and excluded upstream. */
export function freshnessHealth(
  latestIso: string | null,
  expectedHours: number
): { ageLabel: string; state: "ok" | "warn" | "late"; inWindow: boolean; ageHours: number } {
  if (!latestIso) return { ageLabel: "no data", state: "late", inWindow: false, ageHours: Infinity };
  const ageMs = Date.now() - new Date(latestIso).getTime();
  const ageHours = ageMs / 3_600_000;
  const inWindow = ageHours <= expectedHours;
  const state: "ok" | "warn" | "late" = inWindow ? "ok" : ageHours <= expectedHours * 2 ? "warn" : "late";
  const ageLabel =
    ageHours < 1
      ? `${Math.round(ageHours * 60)} m`
      : ageHours < 48
        ? `${Math.round(ageHours)} h${inWindow ? " · in window" : ""}`
        : `${Math.round(ageHours / 24)} d${inWindow ? " · in window" : ""}`;
  return { ageLabel, state, inWindow, ageHours };
}

export function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}
