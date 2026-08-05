/* ============================================================
   Dallas Police Incidents adapter — qv6i-rri7 (Socrata, dallasopendata.com)
   The full official incident record (~1.5M rows, coordinates built in).
   This is Dallas's CONFIRMED / historical gun-violence layer — the
   equivalent of Chicago's CPD Violence Reduction dataset — and what
   populates the 125-day board, Pulse rings, and the A-2 confirmed rule.

   We query per campus with a spatial within_circle so we only ever pull
   the small set of firearm-involved violent incidents near a school
   (not the whole city). Coordinates come from geocoded_column, so no
   geocoding pass is needed. ODC-BY attribution required.
   ============================================================ */

import type { AdapterCampus, AdapterResult, NormalizedIncident } from "./contract";
import { socrataRecent, socrataFreshness, freshnessHealth, num } from "./socrata";
import { centralWallToUtc } from "../time";

const SRC = { host: "www.dallasopendata.com", dataset: "qv6i-rri7" };
export const DALLAS_INCIDENTS_ATTRIBUTION = "Contains information from Dallas OpenData, ODC-BY.";
const DATE_FIELD = "date1";
const WINDOW_DAYS = 125; // gun-violence research window (matches Pulse)
const RADIUS_M = 900; // ~0.56 mi — just past the 0.5 mi ring; re-filtered precisely downstream
const EXPECTED_HOURS = 96; // the record posts on a daily-ish cadence

// firearm-involved AND an actual act of violence (not mere possession/carry)
const GUN =
  "(upper(weaponused) like '%FIREARM%' OR upper(weaponused) like '%HANDGUN%' OR upper(weaponused) like '%GUN%' OR upper(weaponused) like '%RIFLE%' OR upper(weaponused) like '%SHOTGUN%')";
const VIOLENT =
  "(upper(offincident) like '%ASSAULT%' OR upper(offincident) like '%ROBBERY%' OR upper(offincident) like '%MURDER%' OR upper(offincident) like '%DISCHARGE%' OR upper(offincident) like '%DEADLY CONDUCT%' OR upper(offincident) like '%SHOOT%' OR upper(nibrs_crime) like '%HOMICIDE%' OR upper(nibrs_crime) like '%AGG ASSAULT%')";

interface DpiRow {
  incidentnum?: string;
  offincident?: string;
  nibrs_crime?: string;
  weaponused?: string;
  date1?: string;
  time1?: string;
  geocoded_column?: { latitude?: string; longitude?: string } | null;
}

function cutoffIso(now: Date): string {
  return new Date(now.getTime() - WINDOW_DAYS * 86400000).toISOString().slice(0, 19);
}

function occurredIso(date1?: string, time1?: string): string | undefined {
  if (!date1) return undefined;
  const day = date1.split(/[T ]/)[0]; // "2026-08-04"
  const t = time1 && /^\d{1,2}:\d{2}/.test(time1) ? (time1.length === 5 ? `${time1}:00` : time1) : "12:00:00";
  return centralWallToUtc(`${day}T${t}`);
}

function classify(off: string): { kind: string; victimNote?: string } {
  const u = off.toUpperCase();
  if (/MURDER|HOMICIDE|CAPITAL/.test(u)) return { kind: "homicide", victimNote: "fatal" };
  if (/DISCHARGE|SHOOT/.test(u)) return { kind: "shooting" };
  return { kind: "armed assault" }; // firearm assault / armed robbery
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function runDallasIncidentsAdapter(
  campuses: AdapterCampus[],
  now = new Date()
): Promise<AdapterResult> {
  const errors: string[] = [];
  let latest: string | null = null;
  try {
    latest = await socrataFreshness(SRC, DATE_FIELD);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const cutoff = cutoffIso(now);
  const seen = new Set<string>();
  const incidents: NormalizedIncident[] = [];

  for (const c of campuses) {
    const where = `within_circle(geocoded_column, ${c.lat}, ${c.lon}, ${RADIUS_M}) AND ${DATE_FIELD} > '${cutoff}' AND ${GUN} AND ${VIOLENT}`;
    let rows: DpiRow[] = [];
    try {
      rows = (await socrataRecent(SRC, DATE_FIELD, 400, where)) as DpiRow[];
    } catch (e) {
      errors.push(`${c.code}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    for (const r of rows) {
      const id = r.incidentnum;
      if (!id || seen.has(id)) continue;
      const lat = num(r.geocoded_column?.latitude);
      const lon = num(r.geocoded_column?.longitude);
      if (lat == null || lon == null) continue;
      seen.add(id);
      const off = r.offincident || r.nibrs_crime || "firearm incident";
      const { kind, victimNote } = classify(off);
      incidents.push({
        source: "Dallas PD gun-violence incidents qv6i-rri7",
        sourceRecordId: `dpi:${id}`,
        headline: `Confirmed ${kind} · ${titleCase(off)}`,
        kind,
        tier: "CONFIRMED",
        lat,
        lon,
        geoConfidence: "block",
        occurredAt: occurredIso(r.date1, r.time1),
        publishedAt: occurredIso(r.date1, r.time1),
        victimNote,
        note: `Dallas Police public incident record · ${r.weaponused ?? "firearm"}`,
      });
    }
  }

  const health = freshnessHealth(latest, EXPECTED_HOURS);
  return {
    source: "Dallas PD gun-violence incidents qv6i-rri7",
    fetched: incidents.length,
    incidents,
    weatherSignals: [],
    health: {
      key: "dpi",
      label: "Dallas PD incidents",
      ageLabel: health.ageLabel,
      expectedWindow: "≤96h window",
      inWindow: health.inWindow,
      state: health.state,
    },
    errors,
  };
}
