/* ============================================================
   Watch — the voice (V2 directive §1).
   DETERMINISTIC TEMPLATES. Human-authored strings with merge
   fields filled from the rules engine's facts. NEVER LLM-generated.
   First person, plain sentences, no hyperbole, no exclamation
   marks, contractions welcome, numbers spelled the way a person
   says them.
   ============================================================ */

import type { CampusStatus, Incident, Status } from "./types";
import type { NetworkData } from "./networkData";

/* ---------- primitives ---------- */

export type SentClass = "clear" | "monitor" | "elev" | "alert";
export interface Seg {
  t: string;
  b?: boolean;
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve",
];
export function numWord(n: number): string {
  return n >= 0 && n <= 12 ? ONES[n] : String(n);
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function statusWord(s: Status): string {
  return s === "CLEAR" ? "clear" : s === "MONITOR" ? "on monitor" : s === "ELEVATED" ? "elevated" : "on alert";
}
export function statusClass(s: Status): SentClass {
  return s === "CLEAR" ? "clear" : s === "MONITOR" ? "monitor" : s === "ELEVATED" ? "elev" : "alert";
}

const BEARINGS: Record<string, string> = {
  N: "north", NE: "northeast", E: "east", SE: "southeast",
  S: "south", SW: "southwest", W: "west", NW: "northwest",
};
export function bearingWord(b?: string): string {
  return b ? BEARINGS[b] ?? "" : "";
}

/** "three blocks northeast" — a person's estimate (~0.09 mi/block). */
export function blocksPhrase(distanceMi?: number, bearing?: string): string {
  if (distanceMi == null) return "nearby";
  const blocks = Math.max(1, Math.round(distanceMi / 0.09));
  const bw = bearingWord(bearing);
  return `${numWord(blocks)} block${blocks === 1 ? "" : "s"}${bw ? " " + bw : ""}`;
}
/** "0.28 miles northeast" — the precise version, for the leader. */
export function milesPhrase(distanceMi?: number, bearing?: string): string {
  if (distanceMi == null) return "nearby";
  const d = distanceMi < 1 ? distanceMi.toFixed(2) : distanceMi.toFixed(1);
  const bw = bearingWord(bearing);
  return `${d} miles${bw ? " " + bw : ""}`;
}

/* ---------- time ---------- */

function centralYMD(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}
function centralParts(d: Date): { hm: string; h24: number; ymd: string } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true, hourCycle: "h12",
  }).formatToParts(d);
  const hour = f.find((p) => p.type === "hour")?.value ?? "";
  const min = f.find((p) => p.type === "minute")?.value ?? "";
  const h24n = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", hour: "2-digit", hour12: false }).format(d)
  );
  return { hm: `${hour}:${min}`, h24: h24n, ymd: centralYMD(d) };
}
/** "6:40" (no am/pm). */
export function clockOf(iso: string): string {
  return centralParts(new Date(iso)).hm;
}
/** "Last night at 11:47" — for the Act comms drafts. */
export function occurredPhrase(iso: string, now = new Date()): string {
  const w = whenWord(iso, now);
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  return `${cap} at ${clockOf(iso)}`;
}
/** context word for when something happened relative to now, in Central. */
function whenWord(iso: string, now: Date): string {
  const ev = new Date(iso);
  const evP = centralParts(ev);
  const today = centralYMD(now);
  if (evP.ymd === today) return evP.h24 < 12 ? "this morning" : "today";
  // previous calendar day
  const yest = centralYMD(new Date(now.getTime() - 24 * 3600 * 1000));
  if (evP.ymd === yest) return evP.h24 >= 18 || evP.h24 < 5 ? "last night" : "yesterday";
  return "earlier";
}
export function centralHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", hour: "2-digit", hour12: false }).format(now));
}
export function greeting(now: Date): string {
  const h = centralHour(now);
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
/** time-of-day nouns so the voice never says "overnight" at 3 PM. */
export function overnightWord(now: Date): string {
  return centralHour(now) < 12 ? "overnight" : "so far today";
}
export function watchedWindow(now: Date): string {
  return centralHour(now) < 12 ? "through the night" : "through the day";
}
export function briefingMicro(now: Date, tail: string): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(now);
  return `${date} · ${time} · ${tail}`;
}

/* ---------- incident phrasing ---------- */

export function incidentTypeWord(i: Incident): string {
  const k = (i.kind || "").toLowerCase();
  if (k.includes("shooting")) return "shooting";
  if (k.includes("shots")) return "shots-fired report";
  if (k.includes("stab")) return "stabbing";
  if (k.includes("weather") || k.includes("advisory")) return "weather advisory";
  return i.kind || "incident";
}

/** the location clause from an incident headline: "63rd & Halsted block". */
export function placeOf(i: Incident): string {
  const parts = (i.headline || "").split("·");
  return (parts[1] ?? parts[0] ?? "").trim() || "nearby";
}

/** authority language — city-aware. Chicago publishes a record; Dallas dispatches. */
export function confirmClause(i: Incident, city: string): { verb: string; who: string } {
  const isDallas = /dallas/i.test(city);
  const isWeather = /weather|advisory|nws/i.test(i.kind + " " + i.source);
  if (isWeather) return { who: "the National Weather Service", verb: "issued the alert" };
  if (isDallas) return { who: "Dallas police", verb: "were dispatched to the scene" };
  return { who: "Chicago Police", verb: "published the record" };
}

/* ---------- pick the driving incident ---------- */

function topIncidentFor(data: NetworkData, code: string): Incident | undefined {
  const rank: Record<string, number> = { CONFIRMED: 0, CORROBORATED: 1, REPORTED: 2 };
  return data.incidents
    .filter((i) => i.nearestCampusCode === code)
    .sort((a, b) => (rank[a.tier] ?? 3) - (rank[b.tier] ?? 3))[0];
}

/* ============================================================
   BRIEFING — CEO altitude
   ============================================================ */

export interface Briefing {
  micro: string;
  lead: string;
  key: string;
  keyClass: SentClass;
  para: Seg[];
}

export function ceoBriefing(data: NetworkData, now = new Date()): Briefing {
  const n = data.campuses.length;
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const attention = data.statuses
    .filter((s) => s.status === "ELEVATED" || s.status === "ALERT")
    .sort((a, b) => rank[a.status] - rank[b.status]);
  const clearCount = data.statuses.filter((s) => s.status === "CLEAR").length;
  const h = centralHour(now);
  const micro = briefingMicro(now, h < 12 ? "Morning briefing" : "Today's briefing");
  const hasWeather = data.incidents.some((i) => /weather|advisory|nws/i.test(i.kind + " " + i.source));
  const weather = hasWeather ? "There is a weather advisory in effect — outdoor guidance applies" : "No weather concerns";

  const monitorCount = data.statuses.filter((s) => s.status === "MONITOR").length;
  if (attention.length === 0) {
    // No campus is ELEVATED/ALERT. But MONITOR is a soft watch posture — not
    // "clear" — so the hero must not claim all-clear when campuses are on watch.
    if (monitorCount > 0) {
      const allMon = monitorCount >= n;
      const monN = numWord(monitorCount);
      return {
        micro,
        lead: `${greeting(now)}.`,
        key: allMon ? `All ${numWord(n)} campuses are steady.` : `${cap(monN)} campus${monitorCount > 1 ? "es are" : " is"} on watch.`,
        keyClass: "monitor",
        para: [
          { t: `No confirmed incident has crossed a line near any campus ${overnightWord(now)}. ` },
          { t: `I'm keeping ${allMon ? "the network" : `${monN} campus${monitorCount > 1 ? "es" : ""}`} on watch — soft signals I'm tracking that haven't met an alert${hasWeather ? ", and a weather advisory is in effect" : ""}. ` },
          { t: "Dismissal looks normal across the network.", b: true },
        ],
      };
    }
    return {
      micro,
      lead: `${greeting(now)}.`,
      key: `All ${numWord(n)} campuses are clear.`,
      keyClass: "clear",
      para: [
        { t: `Nothing has qualified ${overnightWord(now)} — I watched the public record around every campus and none of it crossed a line. ` },
        { t: `${weather}. ` },
        { t: "Dismissal looks normal across the network.", b: true },
      ],
    };
  }

  const worst = attention[0].status;
  const top = topIncidentFor(data, attention[0].campusCode);
  const campus = data.campuses.find((c) => c.code === attention[0].campusCode);
  const cName = campus?.name ?? attention[0].campusCode;
  const principal = campus?.principal ? `Principal ${surname(campus.principal)}` : "the principal";
  const cc = confirmClause(top ?? ({} as Incident), data.city);
  const verbed = worst === "ALERT" ? "put that campus on alert" : "elevated that campus";
  const plural = attention.length > 1;
  const key = `${cap(numWord(attention.length))} campus${plural ? "es" : ""} need${plural ? "" : "s"} your attention.`;

  const para: Seg[] = [];
  if (top) {
    para.push({ t: `A ${incidentTypeWord(top)} was ` });
    para.push({ t: `confirmed ${centralHour(now) < 12 ? "overnight" : "earlier"} ${blocksPhrase(top.distanceMi, top.bearing)} of ${cName}`, b: true });
    para.push({ t: ` — ${cc.who} ${cc.verb} at ${clockOf(top.publishedAt)} ${whenWord(top.publishedAt, now)}${top.victimNote ? "; " + top.victimNote : ""}. I've ${verbed} and prepared morning actions for ${principal}. ` });
  } else {
    para.push({ t: `${cName} needs a closer look this morning. ` });
  }
  if (clearCount > 0) {
    para.push({ t: `The other ${numWord(clearCount)} campus${clearCount > 1 ? "es are" : " is"} clear.`, b: true });
    para.push({ t: ` ${weather}. Dismissal looks normal across the network.` });
  } else {
    para.push({ t: `${weather}. I'll brief you again before dismissal.` });
  }
  return { micro, lead: `${greeting(now)}.`, key, keyClass: statusClass(worst), para };
}

/* ============================================================
   BRIEFING — School Leader altitude (one campus)
   ============================================================ */

export function leaderBriefing(data: NetworkData, code: string, now = new Date()): Briefing {
  const campus = data.campuses.find((c) => c.code === code) ?? data.campuses[0];
  const st = data.statuses.find((s) => s.campusCode === campus.code)?.status ?? "CLEAR";
  const lead = `${greeting(now)}, ${campus.principal ? "Principal " + surname(campus.principal) : "Principal"}.`;
  const micro = briefingMicro(now, centralHour(now) < 12 ? "Your campus this morning" : "Your campus today");
  const key = `Your campus is ${statusWord(st)}.`;
  const keyClass = statusClass(st);

  if (st === "CLEAR") {
    return {
      micro, lead, key, keyClass,
      para: [
        { t: `I watched the blocks around ${campus.name} ${watchedWindow(now)} and nothing qualified. ` },
        { t: "Nothing else is pending. ", b: false },
        { t: centralHour(now) < 15 ? "I'll check again before dismissal and say so if anything changes." : "I'll keep watching through the evening and say so if anything changes." },
      ],
    };
  }

  const top = topIncidentFor(data, campus.code);
  const para: Seg[] = [];
  if (top) {
    const cc = confirmClause(top, data.city);
    para.push({ t: `A ${incidentTypeWord(top)} ` });
    para.push({ t: `occurred at ${clockOf(top.occurredAt)} ${whenWord(top.occurredAt, now)}`, b: true });
    para.push({ t: ` on ${placeOf(top)} — ` });
    para.push({ t: `${milesPhrase(top.distanceMi, top.bearing)}`, b: true });
    para.push({ t: ` of your front door. ${cc.who} ${cc.verb} at ${clockOf(top.publishedAt)} ${whenWord(top.publishedAt, now)}${top.victimNote ? "; " + top.victimNote : ""}. Nothing else qualified ${overnightWord(now)}. ` });
    para.push({ t: "I've prepared your morning", b: true });
    para.push({ t: " — it's below. Status clears at end of day unless something new qualifies." });
  } else {
    para.push({ t: `${campus.name} is ${statusWord(st)} this morning. I've prepared your morning actions below.` });
  }
  return { micro, lead, key, keyClass, para };
}

/* ============================================================
   2:15 dismissal outlook · resolution · pulse header
   ============================================================ */

export function dismissalOutlook(data: NetworkData, code?: string): string {
  if (code) {
    const campus = data.campuses.find((c) => c.code === code);
    const st = data.statuses.find((s) => s.campusCode === code)?.status ?? "CLEAR";
    if (st === "CLEAR") return `Nothing has qualified near ${campus?.name ?? "your campus"} since this morning. Dismissal looks normal.`;
    return `${campus?.name ?? "Your campus"} is still ${statusWord(st)}. I'll flag any change to your blocks before release.`;
  }
  const active = data.statuses.some((s) => s.status === "ELEVATED" || s.status === "ALERT");
  if (!active) return "Nothing has qualified near any campus since this morning. Dismissal looks normal.";
  const names = data.statuses
    .filter((s) => s.status === "ELEVATED" || s.status === "ALERT")
    .map((s) => data.campuses.find((c) => c.code === s.campusCode)?.name ?? s.campusCode);
  return `${names.join(" and ")} ${names.length > 1 ? "remain" : "remains"} in a heightened posture. Everywhere else, dismissal looks normal.`;
}

export function resolutionSentence(incidentType: string, campus: string, how: string, status: string, time: string): string {
  return `The ${incidentType} near ${campus} has cleared — ${how}. Status returned to ${status} at ${time}.`;
}

export function pulseHeader(campusName: string, freshCount: number, mostRecentDays?: number): string {
  if (freshCount > 0) {
    return `${cap(numWord(freshCount))} incident${freshCount === 1 ? " is" : "s are"} still fresh near ${campusName}.`;
  }
  if (mostRecentDays != null) {
    return `Nothing fresh near ${campusName} — the most recent verified incident was ${numWord(mostRecentDays)} day${mostRecentDays === 1 ? "" : "s"} ago.`;
  }
  return `Nothing fresh near ${campusName}. The record is quiet.`;
}

/* ---------- helpers ---------- */

function surname(principal: string): string {
  const parts = principal.trim().split(/\s+/);
  return parts[parts.length - 1] || principal;
}

/** story rows for the CEO "while you slept" timeline, from an incident's journey. */
export function storyRows(i: Incident | undefined): { time: string; text: string; cls?: "conf" | "elev" | "alert" }[] {
  if (!i) return [];
  if (i.journey && i.journey.length) {
    return i.journey.map((s) => ({
      time: s.time,
      text: s.detail,
      cls: s.kind === "confirmed" ? "conf" : s.kind === "status" || s.kind === "notified" ? "elev" : undefined,
    }));
  }
  return [];
}
