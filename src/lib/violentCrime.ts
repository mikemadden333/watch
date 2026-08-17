/* ============================================================
   Violent crime near a campus — the broad Watch scope.

   Watch reports VIOLENT crime within one mile of a school — not just
   gun violence. Included: homicide, shootings / shots-fired, armed and
   strong-arm robbery, carjacking (vehicular hijacking), criminal sexual
   assault, aggravated assault / battery (a weapon involved), and
   stabbings. Deliberately EXCLUDED: the low-level noise a principal
   can't act on — simple battery, theft, stolen cars, narcotics, criminal
   damage, public-peace / intoxication.

   Gun violence remains its own, narrower lens (see pulse.ts) because the
   contagion research is specifically about gun violence. This layer is
   the wider "what violent crime is around my school" awareness.
   ============================================================ */

import { distanceMi, bearing } from "./geo";
import type { Campus, Incident } from "./types";
import { PANE_SPAN_MI, PULSE_WINDOW_DAYS, RING_VISUAL_MI, type PulseRing } from "./pulse";

/** the awareness radius for the broad violent-crime scope. */
export const VIOLENT_RADIUS_MI = 1.0;

// low-level offenses we never surface, even when they ride in on a broad
// crime feed. Matched against the incident's kind (and headline as backup).
const EXCLUDE = /simple|theft|larceny|stolen|motor vehicle theft|burglary|narcot|drug|trespass|damage|deceptive|fraud|public peace|intox|liquor|gambl|prostitut|weather|advisory/i;

// the violent set we DO surface. Matched against kind (and headline).
const INCLUDE = /homicide|murder|shoot|shots|gun|firearm|armed|robber|carjack|hijack|sexual assault|agg[^a-z]*assault|aggravated|batter|assault|stab|knife|weapon|discharge/i;

/** Is this incident violent crime a school leader should see? */
export function isViolentCrime(i: Pick<Incident, "kind" | "headline">): boolean {
  const hay = `${i.kind || ""} ${i.headline || ""}`;
  if (EXCLUDE.test(hay)) {
    // an aggravated/weapon battery is violent even though "battery" alone isn't;
    // let an explicit aggravated/weapon marker override a generic exclude.
    if (/aggravated|agg[^a-z]|weapon|gun|firearm|armed|knife|handgun/i.test(hay) && !/simple/i.test(hay)) {
      return true;
    }
    return false;
  }
  return INCLUDE.test(hay);
}

/** plain-language label for a violent-crime kind. */
export function violentCrimeWord(i: Pick<Incident, "kind" | "headline">): string {
  const k = `${i.kind || ""} ${i.headline || ""}`.toLowerCase();
  if (/homicide|murder/.test(k)) return "homicide";
  if (/carjack|hijack/.test(k)) return "carjacking";
  if (/shoot|discharge|shots|gunfire/.test(k)) return "shooting";
  if (/stab|knife/.test(k)) return "stabbing";
  if (/sexual assault/.test(k)) return "sexual assault";
  if (/robber/.test(k)) return /armed|gun|firearm|handgun/.test(k) ? "armed robbery" : "robbery";
  if (/agg|aggravated/.test(k) && /assault/.test(k)) return "aggravated assault";
  if (/agg|aggravated/.test(k) && /batter/.test(k)) return "aggravated battery";
  if (/weapon/.test(k)) return "weapons offense";
  if (/assault/.test(k)) return "assault";
  if (/batter/.test(k)) return "battery";
  return (i.kind || "violent incident").toLowerCase();
}

/** All CONFIRMED violent-crime incidents within one mile of a campus, over the
 *  125-day record. Same PulseRing shape as pulseForCampus so every board / map
 *  / dial / report that already consumes rings works unchanged. */
export function violentCrimeNear(
  incidents: Incident[],
  campus: Campus,
  now = new Date(),
  radiusMi = VIOLENT_RADIUS_MI
): PulseRing[] {
  const unitsPerMi = 100 / (radiusMi * 2 * 1.4); // pane spans 2*radius with margin
  const rings: PulseRing[] = [];
  for (const i of incidents) {
    if (i.tier !== "CONFIRMED") continue;
    if (i.geoConfidence && i.geoConfidence !== "exact" && i.geoConfidence !== "block") continue;
    if (!isViolentCrime(i)) continue;
    if (!i.lat || !i.lon) continue;
    const d = distanceMi({ lat: i.lat, lon: i.lon }, campus);
    if (d > radiusMi + 0.05) continue;
    const ageDays = (now.getTime() - new Date(i.occurredAt).getTime()) / 86400000;
    if (ageDays < 0 || ageDays > PULSE_WINDOW_DAYS) continue;
    const decayFrac = Math.max(0, 1 - ageDays / PULSE_WINDOW_DAYS);
    const fillOpacity = Math.max(0.06, 0.36 * decayFrac);
    const strokeOpacity = Math.min(0.9, fillOpacity * 2.5);
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
      ageLabel: ageDays < 1 ? `${Math.max(1, Math.round(ageDays * 24))} h ago` : `${Math.round(ageDays)} d ago`,
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
