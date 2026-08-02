/* ============================================================
   Watch — domain types
   Mirrors the Supabase schema (see supabase/migrations).
   ============================================================ */

export type Status = "CLEAR" | "MONITOR" | "ELEVATED" | "ALERT";

export type Tier = "CONFIRMED" | "CORROBORATED" | "REPORTED";

/** LIVE = happening now (e.g. NWS warning). DATA-DAY = confirmed
 *  incident published this morning that occurred earlier. */
export type AlertClass = "LIVE" | "DATA-DAY";

export interface Tenant {
  id: string;
  name: string; // "Veritas Charter Schools"
  city: string; // "Chicago"
  rulesVersion: string; // "v2.0"
}

export interface Campus {
  id: string;
  code: string; // "ENG"
  name: string; // "Englewood Prep"
  address: string;
  lat: number;
  lon: number;
  students: number;
  grades: string; // "K-8"
  dismissal: string; // "15:30"
  principal: string;
  cpdLiaison?: string;
  alertRingMi: number; // 0.25
  elevatedRingMi: number; // 0.5
  geocodeVerified: boolean;
}

export interface Incident {
  id: string;
  sourceRecordId: string; // idempotency / dedupe key
  headline: string; // "Confirmed shooting · 63rd & Halsted block"
  kind: string; // "shooting" | "shots-fired" | "weather" ...
  tier: Tier;
  source: string; // "CPD VR gumc-mgzr"
  corroboratingSources?: string[];
  lat: number;
  lon: number;
  /** the three clocks — always carried, gap always shown */
  occurredAt: string; // ISO
  publishedAt: string; // ISO
  detectedAt: string; // ISO
  victimNote?: string; // "1 victim, non-fatal"
  nearestCampusCode?: string;
  distanceMi?: number; // to nearest campus
  bearing?: string; // "NE"
  note?: string; // "outside all rings, logged"
}

export interface CampusStatus {
  campusCode: string;
  status: Status;
  since: string; // ISO or "06:40"
  ruleId?: string; // "E-2"
  ruleName?: string; // "confirmed-in-ring"
  detail?: string; // "Confirmed shooting · morning posture"
  incidentId?: string;
}

export interface FeedHealth {
  key: string; // "nws"
  label: string; // "NWS alerts"
  age: string; // "live · 2 m", "26 h · in window", "64 m · degraded"
  state: "ok" | "warn" | "late";
  inWindow: boolean;
  expectedWindow?: string; // "≤48h window"
  footLabel: string; // short label for footer chip: "NWS"
  footValue: string; // "✓ live", "✓ 26h", "degraded"
}

export interface AuditEvent {
  id: string;
  time: string; // "14:52:07"
  type: "STATUS" | "DELIVERY" | "ACTION" | "INGEST" | "LOGIN" | "MUTE";
  event: string;
  evidence: string;
  campusCode?: string;
  statusColor?: Status; // for STATUS-type pill coloring
}

export interface PlaybookStep {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  actor?: string; // "AO"
  completedAt?: string; // "07:02"
}

export interface Playbook {
  status: Status;
  role: string; // "Principal"
  author: string; // "ops"
  version: string; // "v3.2"
  steps: PlaybookStep[];
}

export interface TimelineEntry {
  time: string; // "06:40"
  text: string;
  kind: "active" | "past" | "future";
}

export interface Contact {
  name: string;
  role: string;
  value: string;
}

export interface AlertItem {
  id: string;
  status: Status;
  alertClass: AlertClass;
  title: string;
  ruleText: string;
  time: string; // "14:52 today"
  sourceChip: string; // "NWS · CAP alert"
  deliveryChips: string[];
}

export interface LedgerMetric {
  label: string;
  value: string;
  pct: number; // bar fill 0-100
  barColor: "clear" | "ink";
  note: string;
}

export interface DataSourceToggle {
  label: string;
  state: string; // "ON · live", "OFF · not contracted"
  on: boolean;
  optional?: boolean;
}

export interface Threshold {
  label: string;
  value: string;
}
