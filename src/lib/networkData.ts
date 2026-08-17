/* ============================================================
   Live network read layer — SERVER ONLY.
   Reads a tenant's current state from Supabase (service client,
   filtered by tenant slug) and maps it to the app's view types.
   Used by the Dallas (Solis) screens, which are fully live. Chicago
   (Veritas) keeps its authored fixture spine as the demo backbone.

   Never import this into a client component — it uses the service key
   (SUPABASE_SERVICE_ROLE_KEY is non-public, so it is never bundled to
   the browser; there it simply returns null).
   ============================================================ */

import { cache } from "react";
import { getServiceClient } from "./supabase";
import { distanceMi, bearing } from "./geo";
import { fmtCentral } from "./time";
import type {
  AuditEvent,
  Campus,
  CampusStatus,
  FeedHealth,
  Incident,
  LedgerMetric,
  Status,
  Tier,
} from "./types";

export interface NetworkData {
  slug: string;
  tenantName: string;
  city: string;
  live: boolean; // true when data came from the DB
  campuses: Campus[];
  statuses: CampusStatus[];
  incidents: Incident[];
  feeds: FeedHealth[];
  audit: AuditEvent[];
  ledger: LedgerMetric[];
  counts: { alert: number; elevated: number; monitor: number; clear: number };
}

const STATUS_ORDER: Record<Status, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };

export const getNetworkData = cache(_getNetworkData);

async function _getNetworkData(slug: string): Promise<NetworkData | null> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return null; // Supabase not configured
  }

  const { data: tenant } = await sb
    .from("tenants")
    .select("id,name,city")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return null;
  const tid = tenant.id as string;

  const [campusRes, statusRes, incidentRes, healthRes, auditRes, ledgerRes] = await Promise.all([
    sb.from("campuses").select("*").eq("tenant_id", tid),
    sb.from("campus_status").select("*").eq("tenant_id", tid),
    sb
      .from("incidents")
      .select("*")
      .eq("tenant_id", tid)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    sb.from("source_health").select("*").eq("tenant_id", tid),
    sb.from("audit_events").select("*").eq("tenant_id", tid).order("occurred_at", { ascending: false }).limit(30),
    sb.from("accuracy_ledger").select("*").eq("tenant_id", tid),
  ]);

  const campuses: Campus[] = (campusRes.data ?? []).map(mapCampus);
  const statuses: CampusStatus[] = (statusRes.data ?? []).map((s) => mapStatus(s, campuses));
  const incidents: Incident[] = (incidentRes.data ?? []).map((i) => mapIncident(i, campuses));
  const feeds: FeedHealth[] = (healthRes.data ?? []).map(mapFeed);
  const audit: AuditEvent[] = (auditRes.data ?? []).map(mapAudit);
  const ledger: LedgerMetric[] = (ledgerRes.data ?? []).map(mapLedger);
  const detLat = detectionLatencyMetric(incidents);
  if (detLat) ledger.unshift(detLat);

  const counts = { alert: 0, elevated: 0, monitor: 0, clear: 0 };
  for (const s of statuses) {
    if (s.status === "ALERT") counts.alert++;
    else if (s.status === "ELEVATED") counts.elevated++;
    else if (s.status === "MONITOR") counts.monitor++;
    else counts.clear++;
  }

  campuses.sort((a, b) => {
    const sa = statuses.find((s) => s.campusCode === a.code)?.status ?? "CLEAR";
    const sb2 = statuses.find((s) => s.campusCode === b.code)?.status ?? "CLEAR";
    return STATUS_ORDER[sa] - STATUS_ORDER[sb2];
  });

  return {
    slug,
    tenantName: tenant.name as string,
    city: tenant.city as string,
    live: true,
    campuses,
    statuses,
    incidents,
    feeds,
    audit,
    ledger,
    counts,
  };
}

/* ---------- row mappers ---------- */

// Demo persona: the school we walk through is led by Principal Thomas, so the
// former principal in the room feels himself back in the building. Applied at
// the data layer so the name is consistent everywhere (briefing, comms sign-off).
const PRINCIPAL_OVERRIDE: Record<string, string> = { GPA: "V. Parks" };

function mapCampus(r: Record<string, unknown>): Campus {
  const code = String(r.code);
  return {
    id: String(r.id),
    code,
    name: String(r.name),
    address: String(r.address ?? ""),
    lat: Number(r.lat),
    lon: Number(r.lon),
    students: Number(r.students ?? 0),
    grades: String(r.grades ?? ""),
    dismissal: String(r.dismissal ?? ""),
    principal: PRINCIPAL_OVERRIDE[code] ?? String(r.principal ?? ""),
    cpdLiaison: r.cpd_liaison ? String(r.cpd_liaison) : undefined,
    alertRingMi: Number(r.alert_ring_mi ?? 0.25),
    elevatedRingMi: Number(r.elevated_ring_mi ?? 0.5),
    geocodeVerified: Boolean(r.geocode_verified),
    quietWindowsEnabled: r.quiet_windows_enabled == null ? true : Boolean(r.quiet_windows_enabled),
    arrivalStart: r.arrival_start ? String(r.arrival_start) : undefined,
    arrivalEnd: r.arrival_end ? String(r.arrival_end) : undefined,
    dismissalStart: r.dismissal_start ? String(r.dismissal_start) : undefined,
    dismissalEnd: r.dismissal_end ? String(r.dismissal_end) : undefined,
  };
}

function mapStatus(r: Record<string, unknown>, campuses: Campus[]): CampusStatus {
  const campus = campuses.find((c) => c.id === String(r.campus_id));
  return {
    campusCode: campus?.code ?? String(r.campus_id).slice(0, 4),
    status: String(r.status) as Status,
    since: fmtTime(r.since as string),
    ruleId: r.rule_id ? String(r.rule_id) : undefined,
    ruleName: r.rule_name ? String(r.rule_name) : undefined,
    detail: r.detail ? String(r.detail) : undefined,
    incidentId: r.incident_id ? String(r.incident_id) : undefined,
  };
}

function mapIncident(r: Record<string, unknown>, campuses: Campus[]): Incident {
  const lat = r.lat != null ? Number(r.lat) : NaN;
  const lon = r.lon != null ? Number(r.lon) : NaN;
  let nearestCampusCode: string | undefined;
  let dist: number | undefined;
  let bear: string | undefined;
  if (!Number.isNaN(lat) && !Number.isNaN(lon) && campuses.length) {
    let best: Campus | null = null;
    let bestMi = Infinity;
    for (const c of campuses) {
      const d = distanceMi({ lat, lon }, c);
      if (d < bestMi) {
        bestMi = d;
        best = c;
      }
    }
    if (best) {
      nearestCampusCode = best.code;
      dist = Math.round(bestMi * 100) / 100;
      bear = bearing(best, { lat, lon });
    }
  }
  return {
    id: String(r.id),
    sourceRecordId: String(r.source_record_id ?? ""),
    headline: String(r.headline ?? ""),
    kind: String(r.kind ?? ""),
    tier: String(r.tier) as Tier,
    source: String(r.source ?? ""),
    corroboratingSources: (r.corroborating as string[]) ?? undefined,
    lat: Number.isNaN(lat) ? 0 : lat,
    lon: Number.isNaN(lon) ? 0 : lon,
    occurredAt: String(r.occurred_at ?? r.detected_at ?? ""),
    publishedAt: String(r.published_at ?? r.detected_at ?? ""),
    detectedAt: String(r.detected_at ?? ""),
    victimNote: r.victim_note ? String(r.victim_note) : undefined,
    nearestCampusCode,
    distanceMi: dist,
    bearing: bear,
    note: r.note ? String(r.note) : undefined,
    geoConfidence: r.geo_confidence ? (String(r.geo_confidence) as Incident["geoConfidence"]) : undefined,
    verifiedBy: r.verified_by ? String(r.verified_by) : undefined,
    verifiedAt: r.verified_at ? fmtTime(String(r.verified_at)) : undefined,
    verifierNote: r.verifier_note ? String(r.verifier_note) : undefined,
  };
}

/** v1.1 detection-latency metric: median of (detected_at − published_at)
 *  across incidents that carry both clocks. "Finding out" is the promise,
 *  so Watch measures and publishes its own time-to-detection. */
function detectionLatencyMetric(incidents: Incident[]): LedgerMetric | null {
  const secs = incidents
    .filter((i) => i.publishedAt && i.detectedAt)
    .map((i) => (new Date(i.detectedAt).getTime() - new Date(i.publishedAt).getTime()) / 1000)
    .filter((s) => s >= 0)
    .sort((a, b) => a - b);
  if (!secs.length) return null;
  const median = secs[Math.floor(secs.length / 2)];
  const label = median < 3600 ? `${Math.round(median / 60)} m` : `${(median / 3600).toFixed(1)} h`;
  return {
    label: "Median detection latency",
    value: label,
    pct: Math.max(4, Math.min(100, 100 - median / 3600 / 0.24)),
    barColor: "ink",
    note: `publish → surfaced · ${secs.length} incidents scored`,
  };
}

function mapFeed(r: Record<string, unknown>): FeedHealth {
  const state = String(r.state ?? "ok") as "ok" | "warn" | "late";
  const label = String(r.label ?? r.key);
  return {
    key: String(r.key),
    label,
    age: String(r.age_label ?? ""),
    state,
    inWindow: Boolean(r.in_window),
    expectedWindow: r.expected_window ? String(r.expected_window) : undefined,
    footLabel: shortLabel(String(r.key)),
    footValue: state === "ok" ? `✓ ${shortAge(String(r.age_label ?? ""))}` : "degraded",
  };
}

function mapAudit(r: Record<string, unknown>): AuditEvent {
  return {
    id: String(r.id),
    time: fmtTime(r.occurred_at as string, true),
    type: String(r.type) as AuditEvent["type"],
    event: String(r.event ?? ""),
    evidence: String(r.evidence ?? ""),
    statusColor: r.status_color ? (String(r.status_color) as Status) : undefined,
  };
}

function mapLedger(r: Record<string, unknown>): LedgerMetric {
  return {
    label: String(r.label),
    value: String(r.value),
    pct: Number(r.pct ?? 0),
    barColor: String(r.metric_key).includes("gap") ? "ink" : "clear",
    note: String(r.window_note ?? ""),
  };
}

/* ---------- helpers ---------- */

function fmtTime(iso?: string, withSeconds = false): string {
  return fmtCentral(iso, withSeconds);
}
function shortLabel(key: string): string {
  const m: Record<string, string> = {
    nws: "NWS",
    news: "News",
    gdelt: "GDELT",
    cpdvr: "CPD VR",
    me: "ME",
    crimes: "Crimes",
    rss: "RSS",
    dpd: "DPD",
  };
  return m[key] ?? key.toUpperCase();
}
function shortAge(age: string): string {
  return age.replace(" · in window", "").replace("live · ", "").trim() || "live";
}
