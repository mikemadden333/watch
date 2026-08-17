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
const EXPECTED_HOURS = 12 * 24; // ≤12d — CPD's full crime dataset publishes ~8 days behind by policy, plus processing lag

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
    // Query per campus, within one mile, over the 125-day window — so the
    // board's "violent crime within a mile" is actually backed by a mile of
    // data (the old citywide-recent query only ever reached ~0.5 mi).
    const typeClause = `primary_type in (${[...RELEVANT].map((t) => `'${t}'`).join(",")})`;
    const sinceIso = new Date(Date.now() - 130 * 86400000).toISOString().slice(0, 19);
    const seen = new Set<string>();
    for (const c of campuses) {
      const where = `${typeClause} AND date >= '${sinceIso}' AND within_circle(location, ${c.lat}, ${c.lon}, 1700)`;
      const part = (await socrataRecent(SRC, DATE_FIELD, Math.max(limit, 1500), where)) as CrimeRow[];
      for (const row of part) {
        const key = String(row.id || row.case_number || "");
        if (key && !seen.has(key)) { seen.add(key); rows.push(row); }
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const health = freshnessHealth(latest, EXPECTED_HOURS);
  const incidents: NormalizedIncident[] = [];
  for (const r of rows) {
    const id = r.id || r.case_number;
    if (!id) continue;
    const pt = (r.primary_type || "").toUpperCase();
    const desc = (r.description || "").toUpperCase();
    const cls = classifyCrime(pt, desc);
    if (!cls) continue; // low-level (simple battery/assault, etc.) — never surfaced
    incidents.push({
      source: "CPD Crimes ijzp-q8t2",
      sourceRecordId: `crime:${id}`,
      headline: `${cls.label} · ${titleCase(r.block || "Chicago")}`,
      kind: cls.kind,
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

/** Classify a CPD crime into a violent-crime kind, or null to drop it (simple
 *  battery/assault and anything not genuinely violent). The description field
 *  carries the aggravated/simple + weapon distinction that primary_type lacks. */
function classifyCrime(pt: string, desc: string): { kind: string; label: string } | null {
  const gun = /GUN|FIREARM|HANDGUN|SHOT|ARMED|WEAPON/.test(desc);
  const knife = /KNIF|CUTTING|STAB/.test(desc);
  const agg = /AGG|AGGRAVATED|GREAT BODILY|STRONG ?ARM/.test(desc);
  const simple = /SIMPLE/.test(desc);

  if (pt === "HOMICIDE") return { kind: "homicide", label: "Homicide" };
  if (pt === "CRIMINAL SEXUAL ASSAULT") return { kind: "sexual assault", label: "Sexual assault" };
  if (pt === "WEAPONS VIOLATION") return { kind: "weapons offense", label: "Weapons offense" };
  if (pt === "ROBBERY") {
    if (/VEHIC|HIJACK|CARJACK/.test(desc)) return { kind: "carjacking", label: "Carjacking" };
    return gun ? { kind: "armed robbery", label: "Armed robbery" } : { kind: "robbery", label: "Robbery" };
  }
  if (pt === "BATTERY" || pt === "ASSAULT") {
    // only the violent (aggravated / weapon) variants — simple is low-level
    if (simple && !agg && !gun && !knife) return null;
    if (knife) return { kind: "stabbing", label: "Stabbing" };
    if (gun) return { kind: "shooting", label: pt === "BATTERY" ? "Shooting" : "Armed assault" };
    if (agg) return pt === "BATTERY"
      ? { kind: "aggravated battery", label: "Aggravated battery" }
      : { kind: "aggravated assault", label: "Aggravated assault" };
    return null; // plain battery/assault with no aggravating marker → drop
  }
  return null;
}

function isoOrUndef(s?: string): string | undefined {
  return centralWallToUtc(s);
}
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}
