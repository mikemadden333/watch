/* ============================================================
   Dallas PD Active Calls adapter — 9fxf-t2tr (Socrata, dallasopendata.com)
   ODC-BY attribution required. ~2-min refresh. The feed keeps NO
   history, so every poll is ARCHIVED verbatim.

   Dispatch is preliminary: it may drive MONITOR/ELEVATED only, never
   CONFIRMED/ALERT — CONFIRMED comes from the daily official incident
   record. Active calls carry no coordinates; geocoding block+location
   to a campus ring is a follow-up pass over the archive.
   ============================================================ */

import type { AdapterResult, NormalizedIncident } from "./contract";
import { socrataRecent } from "./socrata";

const SRC = { host: "www.dallasopendata.com", dataset: "9fxf-t2tr" };
export const DALLAS_ATTRIBUTION = "Contains information from Dallas OpenData, ODC-BY.";

interface DpdRow {
  incident_number?: string;
  division?: string;
  nature_of_call?: string;
  priority?: string;
  date?: string;
  time?: string;
  block?: string;
  location?: string;
  beat?: string;
  status?: string;
}

// nature-of-call keywords that make a dispatch call safety-relevant
const VIOLENT =
  /shoot|shot|stab|weapon|assault|robbery|gun|discharge|cutting|violen|major dist/i;

export async function runDallasPdAdapter(limit = 500): Promise<{
  result: AdapterResult;
  snapshot: DpdRow[];
}> {
  const errors: string[] = [];
  let rows: DpdRow[] = [];
  try {
    // active-calls feed is unordered/live; pull the current window
    rows = (await socrataRecent(SRC, "date", limit)) as DpdRow[];
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const incidents: NormalizedIncident[] = [];
  for (const r of rows) {
    if (!r.incident_number) continue;
    const nature = r.nature_of_call || "";
    if (!VIOLENT.test(nature)) continue; // only safety-relevant calls become incidents
    const occurredAt = combineDateTime(r.date, r.time);
    incidents.push({
      source: "Dallas PD active calls 9fxf-t2tr",
      sourceRecordId: r.incident_number, // upsert tracks latest status per call
      headline: `Dispatch · ${nature} · ${[r.block, r.location].filter(Boolean).join(" ")}`.trim(),
      kind: "dispatch",
      tier: "REPORTED", // preliminary — never confirms alone
      occurredAt,
      publishedAt: occurredAt,
      note: `${r.division ?? ""} · priority ${r.priority ?? "?"} · ${r.status ?? ""} · geocode pending`.trim(),
    });
  }

  return {
    snapshot: rows,
    result: {
      source: "Dallas PD active calls 9fxf-t2tr",
      fetched: rows.length,
      incidents,
      weatherSignals: [],
      health: {
        key: "dpd",
        label: "DPD active calls",
        ageLabel: rows.length ? "live · 2 m" : "no data",
        expectedWindow: "2 m",
        inWindow: rows.length > 0,
        state: rows.length ? "ok" : "late",
      },
      errors,
    },
  };
}

function combineDateTime(date?: string, time?: string): string | undefined {
  if (!date) return undefined;
  const d = date.split("T")[0];
  return time ? `${d}T${time}` : date;
}
