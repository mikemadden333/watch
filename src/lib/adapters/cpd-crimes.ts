/* ============================================================
   CPD Crimes adapter — ijzp-q8t2 (Socrata)
   All reported crime, block-level, ~8 days behind by policy. This is
   the backfill/context layer (not alerting). We ingest only violent /
   weapon offenses near campuses. Freshness via ordered-desc-limit-1.
   Poll: hourly.
   ============================================================ */

import type { AdapterCampus, AdapterResult, NormalizedIncident } from "./contract";
import { socrataFreshness, socrataRecent, freshnessHealth, num } from "./socrata";
import { centralWallToUtc } from "../time";

const SRC = { host: "data.cityofchicago.org", dataset: "ijzp-q8t2" };
const DATE_FIELD = "date";
const EXPECTED_HOURS = 9 * 24; // ≤9d window

const RELEVANT = new Set([
  "HOMICIDE",
  "ROBBERY",
  "BATTERY",
  "ASSAULT",
  "WEAPONS VIOLATION",
  "CRIMINAL SEXUAL ASSAULT",
]);

interface CrimeRow {
  id?: string;
  case_number?: string;
  date?: string;
  updated_on?: string;
  primary_type?: string;
  description?: string;
  block?: string;
  latitude?: string;
  longitude?: string;
}

export async function runCpdCrimesAdapter(
  campuses: AdapterCampus[],
  limit = 400
): Promise<AdapterResult> {
  const errors: string[] = [];
  let latest: string | null = null;
  let rows: CrimeRow[] = [];

  try {
    latest = await socrataFreshness(SRC, DATE_FIELD);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    const where = `primary_type in (${[...RELEVANT].map((t) => `'${t}'`).join(",")})`;
    rows = (await socrataRecent(SRC, DATE_FIELD, limit, where)) as CrimeRow[];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const health = freshnessHealth(latest, EXPECTED_HOURS);
  const incidents: NormalizedIncident[] = [];
  for (const r of rows) {
    const id = r.id || r.case_number;
    if (!id) continue;
    const pt = (r.primary_type || "").toUpperCase();
    const armed = /GUN|FIREARM|ARMED|HANDGUN/.test((r.description || "").toUpperCase());
    const kind =
      pt === "HOMICIDE" ? "homicide" : armed ? "shooting" : pt.toLowerCase();
    incidents.push({
      source: "CPD Crimes ijzp-q8t2",
      sourceRecordId: `crime:${id}`,
      headline: `${titleCase(pt)} · ${titleCase(r.block || "Chicago")}`,
      kind,
      tier: "CONFIRMED",
      lat: num(r.latitude),
      lon: num(r.longitude),
      occurredAt: isoOrUndef(r.date),
      publishedAt: isoOrUndef(r.updated_on) || isoOrUndef(r.date),
      note: "CPD crimes · 8-day backfill layer",
    });
  }

  return {
    source: "CPD Crimes ijzp-q8t2",
    fetched: rows.length,
    incidents,
    weatherSignals: [],
    health: {
      key: "crimes",
      label: "CPD crimes (all)",
      ageLabel: health.ageLabel,
      expectedWindow: "≤9d window",
      inWindow: health.inWindow,
      state: health.state,
    },
    errors,
  };
}

function isoOrUndef(s?: string): string | undefined {
  return centralWallToUtc(s);
}
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}
