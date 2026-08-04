/* ============================================================
   Watch — deterministic status rules engine v2.0
   Version-pinned, per-account overridable. Every status this
   engine returns carries the rule id and rules version so it can
   be written verbatim into the append-only audit log.

   Precedence (highest firing rule wins):
     ALERT  > ELEVATED > MONITOR > CLEAR

   The engine is pure: same inputs -> same output, always.
   ============================================================ */

import type { Status, Tier } from "./types";
import { distanceMi } from "./geo";

export const RULES_VERSION = "v2.0";

export interface RuleThresholds {
  m1OutletCount: number; // 2
  m1WindowMin: number; // 20
  e3OutletCount: number; // 3
  elevatedRingMi: number; // 0.5 (per campus overridable)
  alertRingMi: number; // 0.25 (per campus overridable)
  citizenContracted: boolean; // A-3 gate — off by default
}

export const DEFAULT_THRESHOLDS: RuleThresholds = {
  m1OutletCount: 2,
  m1WindowMin: 20,
  e3OutletCount: 3,
  elevatedRingMi: 0.5,
  alertRingMi: 0.25,
  citizenContracted: false,
};

export interface RuleIncident {
  id: string;
  kind: string; // "shooting" | "homicide" | "shots-fired" | "dispatch" ...
  headline?: string; // carries the dispatch call nature (A-4)
  tier: Tier;
  lat: number;
  lon: number;
  occurredAt: string;
  publishedAt: string;
  /** number of independent outlets corroborating (for M-1/E-3) */
  outletCount?: number;
  /** spread in minutes between first and last outlet report (M-1 window) */
  corroborationSpreadMin?: number;
  /** Citizen-verified fast signal (A-3) */
  citizenVerified?: boolean;
  /** Location precision. INTEGRITY GATE: only "exact"/"block" incidents may
   *  enter a distance-ring rule. A "neighborhood" centroid can be a mile off
   *  its true point, so testing it against a 0.5 mi ring is meaningless — and
   *  dangerous: it would drive a status on a location we don't actually know.
   *  Coarse signals surface in the briefing as context, never on the map,
   *  never in a ring. Absent ⇒ "exact" (authoritative feeds carry points). */
  geoConfidence?: "exact" | "block" | "neighborhood" | "city";
}

/** The integrity gate. A location must be precise (a real point or a
 *  block/cross-street) to be tested against a campus ring. */
function ringEligible(i: RuleIncident): boolean {
  const g = i.geoConfidence ?? "exact";
  return g === "exact" || g === "block";
}

export interface WeatherSignal {
  kind: "watch" | "warning"; // NWS product type
  intersectsCampus: boolean;
  expiresAt?: string;
}

export interface RuleContext {
  campus: { lat: number; lon: number };
  incidents: RuleIncident[];
  weather: WeatherSignal[];
  now: Date;
  latestDataDay: string; // ISO date "2026-08-01" — the CPD publish day
  thresholds?: Partial<RuleThresholds>;
}

export interface RuleResult {
  status: Status;
  ruleId: string | null; // "A-1", "E-2", "M-1", null for CLEAR
  ruleName: string | null; // "warning-intersect", "confirmed-in-ring", ...
  incidentId?: string;
  detail: string;
  rulesVersion: string;
}

const CONFIRMED_SOURCES: Tier[] = ["CONFIRMED"];
const VIOLENT = new Set(["shooting", "homicide", "shots-fired"]);

/** Is the incident on the latest published data day (morning posture)? */
function onLatestDataDay(inc: RuleIncident, latestDataDay: string): boolean {
  return inc.publishedAt.slice(0, 10) === latestDataDay;
}

export function evaluateCampus(ctx: RuleContext): RuleResult {
  const t = { ...DEFAULT_THRESHOLDS, ...ctx.thresholds };
  const v = RULES_VERSION;

  // ---------- ALERT ----------
  // A-1 · NWS warning polygon intersects campus (LIVE)
  const warning = ctx.weather.find(
    (w) => w.kind === "warning" && w.intersectsCampus
  );
  if (warning) {
    return {
      status: "ALERT",
      ruleId: "A-1",
      ruleName: "warning-intersect",
      detail: "NWS warning polygon intersects campus · authoritative · live",
      rulesVersion: v,
    };
  }

  // A-2 · confirmed shooting/homicide inside alert ring on latest data day
  const a2 = ctx.incidents.find(
    (i) =>
      CONFIRMED_SOURCES.includes(i.tier) &&
      (i.kind === "shooting" || i.kind === "homicide") &&
      onLatestDataDay(i, ctx.latestDataDay) &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.alertRingMi
  );
  if (a2) {
    return {
      status: "ALERT",
      ruleId: "A-2",
      ruleName: "confirmed-shooting-in-alert-ring",
      incidentId: a2.id,
      detail: "Confirmed shooting inside 0.25 mi · latest data day",
      rulesVersion: v,
    };
  }

  // A-3 · Citizen-verified in alert ring — ONLY if Citizen contracted
  if (t.citizenContracted) {
    const a3 = ctx.incidents.find(
      (i) => i.citizenVerified && ringEligible(i) && distanceMi(ctx.campus, i) <= t.alertRingMi
    );
    if (a3) {
      return {
        status: "ALERT",
        ruleId: "A-3",
        ruleName: "citizen-verified-in-ring",
        incidentId: a3.id,
        detail: "Citizen-verified incident inside 0.25 mi",
        rulesVersion: v,
      };
    }
  }

  // A-4 · active police dispatch to a SHOOTING/GUN call inside the alert ring,
  // in the last 30 minutes (live-dispatch cities like Dallas, where the CAD
  // feed is the authoritative real-time signal). Preliminary but alert-worthy:
  // police are actively responding to a shooting close to the school. Scoped by
  // kind === "dispatch" (only the Dallas PD feed produces those). The nature of
  // the call is carried in the headline. Coarse-geo dispatch is excluded by
  // ringEligible, so an imprecise call never pages.
  const a4 = ctx.incidents.find(
    (i) =>
      i.kind === "dispatch" &&
      /\b(shoot|shot|gun|discharge|firearm)/i.test(i.headline || "") &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.alertRingMi &&
      minutesAgo(i.occurredAt, ctx.now) <= 30
  );
  if (a4) {
    return {
      status: "ALERT",
      ruleId: "A-4",
      ruleName: "dispatch-shooting-in-alert-ring",
      incidentId: a4.id,
      detail: "Active police dispatch to a shooting inside 0.25 mi · preliminary",
      rulesVersion: v,
    };
  }

  // ---------- ELEVATED ----------
  // E-1 · NWS watch intersects campus
  const watch = ctx.weather.find(
    (w) => w.kind === "watch" && w.intersectsCampus
  );
  if (watch) {
    return {
      status: "ELEVATED",
      ruleId: "E-1",
      ruleName: "watch-intersect",
      detail: "NWS watch intersects campus",
      rulesVersion: v,
    };
  }

  // E-2 · confirmed incident (CPD VR / ME) inside elevated ring on latest data day
  const e2 = ctx.incidents.find(
    (i) =>
      CONFIRMED_SOURCES.includes(i.tier) &&
      VIOLENT.has(i.kind) &&
      onLatestDataDay(i, ctx.latestDataDay) &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.elevatedRingMi
  );
  if (e2) {
    return {
      status: "ELEVATED",
      ruleId: "E-2",
      ruleName: "confirmed-in-ring",
      incidentId: e2.id,
      detail: "Confirmed incident inside 0.5 mi · morning posture",
      rulesVersion: v,
    };
  }

  // E-3 · M-1 corroboration with 3+ independent sources
  const e3 = ctx.incidents.find(
    (i) =>
      i.tier === "CORROBORATED" &&
      VIOLENT.has(i.kind) &&
      (i.outletCount ?? 0) >= t.e3OutletCount &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.elevatedRingMi &&
      (i.corroborationSpreadMin ?? 0) <= t.m1WindowMin
  );
  if (e3) {
    return {
      status: "ELEVATED",
      ruleId: "E-3",
      ruleName: "corroborated-3plus",
      incidentId: e3.id,
      detail: `Corroborated report · ${e3.outletCount} independent sources`,
      rulesVersion: v,
    };
  }

  // ---------- MONITOR ----------
  // M-1 · 2 independent outlets, violent incident, inside 0.5 mi within 20 min
  const m1 = ctx.incidents.find(
    (i) =>
      i.tier === "CORROBORATED" &&
      VIOLENT.has(i.kind) &&
      (i.outletCount ?? 0) >= t.m1OutletCount &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.elevatedRingMi &&
      (i.corroborationSpreadMin ?? 0) <= t.m1WindowMin
  );
  if (m1) {
    return {
      status: "MONITOR",
      ruleId: "M-1",
      ruleName: "two-outlet-corroboration",
      incidentId: m1.id,
      detail: `Corroborated news · ${m1.outletCount} outlets · unconfirmed`,
      rulesVersion: v,
    };
  }

  // M-2 · official dispatch call inside the elevated ring (e.g. Dallas PD
  // active calls). Preliminary — drives MONITOR only, never ALERT.
  const m2 = ctx.incidents.find(
    (i) =>
      i.kind === "dispatch" &&
      ringEligible(i) &&
      distanceMi(ctx.campus, i) <= t.elevatedRingMi &&
      minutesAgo(i.occurredAt, ctx.now) <= 36 * 60
  );
  if (m2) {
    return {
      status: "MONITOR",
      ruleId: "M-2",
      ruleName: "dispatch-in-ring",
      incidentId: m2.id,
      detail: "Active police dispatch inside 0.5 mi · preliminary",
      rulesVersion: v,
    };
  }

  // ---------- CLEAR ----------
  return {
    status: "CLEAR",
    ruleId: null,
    ruleName: null,
    detail: "No qualifying signals",
    rulesVersion: v,
  };
}

function minutesAgo(iso: string | undefined, now: Date): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (now.getTime() - t) / 60000;
}
