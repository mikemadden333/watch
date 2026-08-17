/* ============================================================
   Pulse — how recent violence sits around a campus (directive §4).
   Backfills rings from the last 125 days of CONFIRMED, ring-eligible
   incidents already in the store. Rings fade over the 125-day window
   (Green, Horel & Papachristos 2017 — how long gun violence stays
   active in a community). Describes what happened and how recently.
   It predicts nothing.
   ============================================================ */

import { distanceMi, bearing } from "./geo";
import type { Campus, Incident } from "./types";

export const PULSE_WINDOW_DAYS = 125;
export const PULSE_RADIUS_MI = 0.5;
/** each incident is drawn as a fixed-visual-radius ring (mi). */
export const RING_VISUAL_MI = 0.15;
/** schematic pane span across the full width (mi). */
export const PANE_SPAN_MI = 1.4;

export interface PulseRing {
  id: string;
  headline: string;
  kind: string;
  victimNote?: string;
  distanceMi: number;
  bearing: string;
  occurredAt: string; // ISO — for the live contagion countdown
  ageDays: number;
  ageLabel: string; // "9 h ago" | "34 d ago"
  decayFrac: number; // remaining fraction of the 125-day window
  fadesInDays: number;
  fillOpacity: number;
  strokeOpacity: number;
  // real geography — for the live map basemap under the radar
  lat: number;
  lon: number;
  // schematic projection, viewBox 0..100, campus at (50,50), north = up
  x: number;
  y: number;
  rUnits: number;
}

function ageLabelOf(days: number): string {
  if (days < 1) {
    const h = Math.max(1, Math.round(days * 24));
    return `${h} h ago`;
  }
  return `${Math.round(days)} d ago`;
}

/** All CONFIRMED, ring-eligible incidents within the window + radius of a campus. */
export function pulseForCampus(incidents: Incident[], campus: Campus, now = new Date()): PulseRing[] {
  const unitsPerMi = 100 / PANE_SPAN_MI;
  const rings: PulseRing[] = [];
  for (const i of incidents) {
    if (i.tier !== "CONFIRMED") continue;
    if (i.geoConfidence && i.geoConfidence !== "exact" && i.geoConfidence !== "block") continue;
    // Pulse is the gun-violence window (the 125-day research is about gun
    // violence). Include CPD VR shootings + ME gun-deaths only — never
    // general battery/assault/theft from the broad crimes feed.
    const gunViolence =
      /shoot|gun|firearm|shots/i.test(i.kind) ||
      /\bvr\b|violence|examiner|gumc|\bme\b/i.test(i.source);
    if (!gunViolence) continue;
    if (/weather|advisory|nws/i.test(i.kind + " " + i.source)) continue;
    if (!i.lat || !i.lon) continue;
    const d = distanceMi({ lat: i.lat, lon: i.lon }, campus);
    if (d > PULSE_RADIUS_MI + 0.05) continue;
    const ageDays = (now.getTime() - new Date(i.occurredAt).getTime()) / 86400000;
    if (ageDays < 0 || ageDays > PULSE_WINDOW_DAYS) continue;
    const decayFrac = Math.max(0, 1 - ageDays / PULSE_WINDOW_DAYS);
    const fillOpacity = Math.max(0.06, 0.36 * decayFrac);
    const strokeOpacity = Math.min(0.9, fillOpacity * 2.5);
    // equirectangular offset from campus, in miles → map units
    const northMi = (i.lat - campus.lat) * 69.0;
    const eastMi = (i.lon - campus.lon) * 69.0 * Math.cos((campus.lat * Math.PI) / 180);
    rings.push({
      id: i.id,
      headline: i.headline,
      kind: i.kind,
      victimNote: i.victimNote,
      distanceMi: Math.round(d * 100) / 100,
      bearing: bearing(campus, { lat: i.lat, lon: i.lon }),
      occurredAt: i.occurredAt,
      ageDays,
      ageLabel: ageLabelOf(ageDays),
      decayFrac,
      fadesInDays: Math.max(0, Math.round(PULSE_WINDOW_DAYS - ageDays)),
      fillOpacity,
      strokeOpacity,
      lat: i.lat,
      lon: i.lon,
      x: 50 + eastMi * unitsPerMi,
      y: 50 - northMi * unitsPerMi,
      rUnits: RING_VISUAL_MI * unitsPerMi,
    });
  }
  return rings.sort((a, b) => a.ageDays - b.ageDays);
}

export function freshThisWeek(rings: PulseRing[]): number {
  return rings.filter((r) => r.ageDays <= 7).length;
}

/** deterministic baseline sentence, computed from this campus's own history:
 *  the most fresh rings that have overlapped inside any 7-day window. */
export function baselineSentence(rings: PulseRing[]): string {
  let peak = 0;
  for (const a of rings) {
    const within = rings.filter((b) => Math.abs(b.ageDays - a.ageDays) <= 7).length;
    if (within > peak) peak = within;
  }
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
  const w = (n: number) => words[n] ?? String(n);
  if (peak <= 1) {
    return "Fresh rings rarely overlap here. Two at once would be worth noticing — I'll say so if it happens.";
  }
  const cap = w(peak).charAt(0).toUpperCase() + w(peak).slice(1);
  return `${cap} fresh ring${peak === 1 ? "" : "s"} at once is the most this campus has seen in the window. ${w(peak + 1).charAt(0).toUpperCase() + w(peak + 1).slice(1)} would be unusual — I'll say so if it happens.`;
}

export function elevatedRadiusUnits(campus: Campus): number {
  return campus.elevatedRingMi * (100 / PANE_SPAN_MI);
}
