/* ============================================================
   CPD Violence Reduction adapter — gumc-mgzr (Socrata)
   Homicide and non-fatal shooting victims, block-level, minute-
   stamped. Verified latency ~13–37 h. This is the CONFIRMED /
   authoritative confirmation layer, not an alerting layer.

   Poll: 30 min. Freshness: ordered-desc-limit-1 (never aggregate).
   ============================================================ */

import type { AdapterCampus, AdapterResult, NormalizedIncident } from "./contract";
import { socrataRecent, socrataFreshness, freshnessHealth, num } from "./socrata";

const SRC = { host: "data.cityofchicago.org", dataset: "gumc-mgzr" };
const DATE_FIELD = "date";
const EXPECTED_HOURS = 48; // ≤48h window

interface VrRow {
  unique_id?: string;
  case_number?: string;
  date?: string;
  updated?: string;
  block?: string;
  gunshot_injury_i?: string;
  victimization_primary?: string;
  latitude?: string;
  longitude?: string;
}

export async function runCpdVrAdapter(
  campuses: AdapterCampus[],
  limit = 200
): Promise<AdapterResult> {
  const errors: string[] = [];
  let rows: VrRow[] = [];
  let latest: string | null = null;

  try {
    // freshness via ordered-desc-limit-1 — NEVER an aggregate query
    latest = await socrataFreshness(SRC, DATE_FIELD);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    rows = (await socrataRecent(SRC, DATE_FIELD, limit)) as VrRow[];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const health = freshnessHealth(latest, EXPECTED_HOURS);
  const incidents: NormalizedIncident[] = [];

  for (const r of rows) {
    const id = r.unique_id || (r.case_number ? `vr:${r.case_number}` : undefined);
    if (!id) continue;
    const lat = num(r.latitude);
    const lon = num(r.longitude);
    const isHomicide = (r.victimization_primary || "").toUpperCase().includes("HOMICIDE");
    const isShooting = (r.gunshot_injury_i || "").toUpperCase() === "YES";
    const kind = isHomicide ? "homicide" : isShooting ? "shooting" : "violent";
    incidents.push({
      source: "CPD VR gumc-mgzr",
      sourceRecordId: id,
      headline: `Confirmed ${kind} · ${titleCase(r.block || "Chicago")}`,
      kind,
      tier: "CONFIRMED",
      lat,
      lon,
      occurredAt: isoOrUndef(r.date),
      publishedAt: isoOrUndef(r.updated) || isoOrUndef(r.date),
      note: "CPD Violence Reduction victims dataset",
    });
  }

  return {
    source: "CPD VR gumc-mgzr",
    fetched: rows.length,
    incidents,
    weatherSignals: [],
    health: {
      key: "cpdvr",
      label: "CPD shootings (VR)",
      ageLabel: health.ageLabel,
      expectedWindow: "≤48h window",
      inWindow: health.inWindow,
      state: health.state,
    },
    errors,
  };
}

function isoOrUndef(s?: string): string | undefined {
  if (!s) return undefined;
  // Socrata floating timestamps have no zone; Chicago open data is local (CT)
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  return iso;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bS\b/g, "S");
}
