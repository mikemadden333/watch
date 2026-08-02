/* ============================================================
   Citizen Enterprise adapter — WEBHOOK (push), SECRET-GATED
   OFF until CITIZEN_WEBHOOK_SECRET is set (trial keys land Thursday).
   Citizen is the one push-based source and the only fast source that
   ships precise COORDINATES + a verification status — which is exactly
   what lets it drive ring rules (MONITOR/ELEVATED, and A-3 ALERT only
   when contracted). Never implied to be CPD-confirmed.
   ============================================================ */

import type { NormalizedIncident } from "./contract";

export function citizenContracted(): boolean {
  return !!process.env.CITIZEN_WEBHOOK_SECRET;
}

export interface CitizenPayload {
  id?: string;
  title?: string;
  description?: string;
  latitude?: number | string;
  longitude?: number | string;
  verified?: boolean;
  severity?: string;
  created_at?: string;
  updated_at?: string;
  city?: string;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

/** Normalize a Citizen incident. Verified → CORROBORATED (near-authoritative
 *  fast), unverified → REPORTED. Carries coordinates, so it can be measured
 *  against campus rings. */
export function normalizeCitizen(p: CitizenPayload): NormalizedIncident | null {
  if (!p.id) return null;
  const t = (p.title || p.description || "Citizen incident").toString();
  return {
    source: "Citizen · verified incident",
    sourceRecordId: `citizen:${p.id}`,
    headline: `Citizen · ${t.slice(0, 120)}`,
    kind: /homicide|shot|shoot/i.test(t) ? "shooting" : /stab/i.test(t) ? "stabbing" : "incident",
    tier: p.verified ? "CORROBORATED" : "REPORTED",
    lat: num(p.latitude),
    lon: num(p.longitude),
    occurredAt: p.created_at,
    publishedAt: p.updated_at || p.created_at,
    note: p.verified ? "Citizen-verified · never implied CPD-confirmed" : "Citizen unverified",
  };
}
