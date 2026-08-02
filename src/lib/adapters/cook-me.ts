/* ============================================================
   Cook County Medical Examiner adapter — cjeq-bs86 (Socrata)
   Deaths incl. gun-related flag, lat/lon. Public domain. Days of
   latency — a slow confirmation source. Poll: every 6 h.

   CRITICAL: production data contains future-dated typos and null
   dates/coords. Date validation on ingest is mandatory (handled by
   the contract's validate()). We surface only gun-related deaths.
   ============================================================ */

import type { AdapterCampus, AdapterResult, NormalizedIncident } from "./contract";
import { isPlausibleDate } from "./contract";
import { socrataRecent, freshnessHealth, num } from "./socrata";

const SRC = { host: "datacatalog.cookcountyil.gov", dataset: "cjeq-bs86" };
const EXPECTED_HOURS = 4 * 24; // ≤4d window (expected freshness of new records)

interface MeRow {
  casenumber?: string;
  incident_date?: string | null;
  death_date?: string | null;
  gunrelated?: boolean;
  manner?: string;
  primarycause?: string;
  latitude?: string | null;
  longitude?: string | null;
  incident_city?: string | null;
}

export async function runCookMeAdapter(
  _campuses: AdapterCampus[],
  limit = 200
): Promise<AdapterResult> {
  const errors: string[] = [];
  let rows: MeRow[] = [];
  try {
    rows = (await socrataRecent(
      SRC,
      "incident_date",
      limit,
      "gunrelated=true AND incident_date IS NOT NULL"
    )) as MeRow[];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // freshness from the newest PLAUSIBLE incident_date — the ME dataset
  // carries future-dated typos (e.g. 9999-09-09) that would otherwise
  // poison the age label even though validate() rejects the incidents.
  const newest = rows
    .map((r) => r.incident_date)
    .filter((d): d is string => !!d && isPlausibleDate(d))
    .sort()
    .at(-1) ?? null;
  const health = freshnessHealth(newest, EXPECTED_HOURS);

  const incidents: NormalizedIncident[] = [];
  for (const r of rows) {
    if (!r.casenumber) continue;
    const homicide = (r.manner || "").toUpperCase().includes("HOMICIDE");
    incidents.push({
      source: "Cook County ME cjeq-bs86",
      sourceRecordId: `me:${r.casenumber}`,
      headline: `Gun-related death · ${titleCase(r.incident_city || "Cook County")}`,
      kind: homicide ? "homicide" : "gun-death",
      tier: "CONFIRMED",
      lat: num(r.latitude ?? undefined),
      lon: num(r.longitude ?? undefined),
      occurredAt: isoOrUndef(r.incident_date),
      publishedAt: isoOrUndef(r.death_date) || isoOrUndef(r.incident_date),
      victimNote: r.primarycause ? titleCase(r.primarycause) : undefined,
      note: "Cook County Medical Examiner",
    });
  }

  return {
    source: "Cook County ME cjeq-bs86",
    fetched: rows.length,
    incidents,
    weatherSignals: [],
    health: {
      key: "me",
      label: "Cook County ME",
      ageLabel: health.ageLabel,
      expectedWindow: "≤4d window",
      inWindow: health.inWindow,
      state: health.state,
    },
    errors,
  };
}

function isoOrUndef(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s.includes("T") ? s : s.replace(" ", "T");
}
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}
