/* ============================================================
   Watch — shared adapter contract
   Every source adapter implements the same pipeline:
     fetch → normalize → geocode/distance per campus → validate
       → idempotent upsert on source_record_id
   plus source-health reporting and graceful degradation.

   Adapters are pure w.r.t. fetching/normalizing (testable against
   live APIs without a database); persistence is a separate step so
   the demo never hard-depends on Supabase being reachable.
   ============================================================ */

import type { Status, Tier } from "../types";
import { getServiceClient } from "../supabase";
import { distanceMi, bearing } from "../geo";

export interface AdapterCampus {
  code: string;
  lat: number;
  lon: number;
  alertRingMi: number;
  elevatedRingMi: number;
}

/** A source record after normalization, before persistence. */
export interface NormalizedIncident {
  source: string;
  sourceRecordId: string; // idempotency key — unique per source
  headline: string;
  kind: string; // 'shooting' | 'shots-fired' | 'weather-advisory' | 'dispatch' ...
  tier: Tier;
  lat?: number;
  lon?: number;
  occurredAt?: string; // ISO — clock 1
  publishedAt?: string; // ISO — clock 2
  victimNote?: string;
  note?: string;
  corroborating?: string[];
  /** nearest campus (filled by attachGeometry) */
  nearestCampusCode?: string;
  distanceMi?: number;
  bearing?: string;
  /** one-line address for later geocoding (e.g. Dallas dispatch) */
  geocodeQuery?: string;
}

/** A weather posture signal fed to the rules engine (NWS). */
export interface NormalizedWeatherSignal {
  campusCode: string;
  kind: "watch" | "warning";
  event: string; // 'Tornado Warning'
  expiresAt?: string;
  sourceRecordId: string;
}

export type HealthState = "ok" | "warn" | "late";

export interface SourceHealth {
  key: string;
  label: string;
  ageLabel: string; // 'live · 2 m'
  expectedWindow?: string; // '≤48h window'
  inWindow: boolean;
  state: HealthState;
}

export interface AdapterResult {
  source: string;
  fetched: number;
  incidents: NormalizedIncident[];
  weatherSignals: NormalizedWeatherSignal[];
  health: SourceHealth;
  errors: string[];
}

/** Attach nearest-campus / distance / bearing to incidents that carry
 *  coordinates. Incidents without coordinates pass through unchanged
 *  (e.g. Dallas dispatch calls awaiting geocode). */
export function attachGeometry(
  incidents: NormalizedIncident[],
  campuses: AdapterCampus[]
): NormalizedIncident[] {
  return incidents.map((inc) => {
    if (inc.lat == null || inc.lon == null || campuses.length === 0) return inc;
    let best: AdapterCampus | null = null;
    let bestMi = Infinity;
    for (const c of campuses) {
      const d = distanceMi({ lat: inc.lat, lon: inc.lon }, c);
      if (d < bestMi) {
        bestMi = d;
        best = c;
      }
    }
    if (!best) return inc;
    return {
      ...inc,
      nearestCampusCode: best.code,
      distanceMi: Math.round(bestMi * 100) / 100,
      bearing: bearing(best, { lat: inc.lat, lon: inc.lon }),
    };
  });
}

/** Date sanity — Cook County ME (and others) contain future-dated typos.
 *  Reject records whose occurred/published clock is in the future beyond
 *  a small skew, or absurdly old. */
export function isPlausibleDate(iso?: string, now = new Date()): boolean {
  if (!iso) return true; // absent clock is allowed; presence is validated
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const skewMs = 6 * 60 * 60 * 1000; // 6h future skew tolerance
  const tenYearsMs = 10 * 365 * 24 * 60 * 60 * 1000;
  if (t > now.getTime() + skewMs) return false; // future-dated typo
  if (t < now.getTime() - tenYearsMs) return false; // absurdly old
  return true;
}

export function validate(incidents: NormalizedIncident[]): {
  ok: NormalizedIncident[];
  rejected: { record: NormalizedIncident; reason: string }[];
} {
  const ok: NormalizedIncident[] = [];
  const rejected: { record: NormalizedIncident; reason: string }[] = [];
  for (const inc of incidents) {
    if (!inc.sourceRecordId) {
      rejected.push({ record: inc, reason: "missing source_record_id" });
      continue;
    }
    if (!isPlausibleDate(inc.occurredAt) || !isPlausibleDate(inc.publishedAt)) {
      rejected.push({ record: inc, reason: "implausible date (future-dated typo?)" });
      continue;
    }
    ok.push(inc);
  }
  return { ok, rejected };
}

/** Resolve a tenant slug (e.g. "veritas-charter") to its DB UUID. The
 *  fixtures/registry carry slugs; the database keys on UUID. Cached per
 *  process. Returns null when Supabase is unreachable or the tenant is
 *  absent (callers then degrade gracefully). */
const tenantIdCache = new Map<string, string>();
export async function resolveTenantId(slug: string): Promise<string | null> {
  if (tenantIdCache.has(slug)) return tenantIdCache.get(slug)!;
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return null;
  }
  const { data, error } = await sb.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  tenantIdCache.set(slug, data.id as string);
  return data.id as string;
}

/** Idempotent upsert into Supabase on (tenant_id, source, source_record_id).
 *  Graceful degrade: if Supabase isn't configured or the table is missing,
 *  returns { persisted: 0, degraded: true } instead of throwing. */
export async function persistIncidents(
  tenantSlug: string,
  incidents: NormalizedIncident[]
): Promise<{ persisted: number; degraded: boolean; error?: string }> {
  if (incidents.length === 0) return { persisted: 0, degraded: false };
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { persisted: 0, degraded: true, error: "supabase not configured" };
  }
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return { persisted: 0, degraded: true, error: "tenant not found (apply seed?)" };
  // dedupe within the batch on the conflict key — Postgres rejects an upsert
  // that would touch the same (tenant, source, source_record_id) twice
  // (e.g. one dispatch call with several units). Keep the last occurrence.
  const byKey = new Map<string, NormalizedIncident>();
  for (const i of incidents) byKey.set(`${i.source}::${i.sourceRecordId}`, i);
  const deduped = [...byKey.values()];
  const rows = deduped.map((i) => ({
    tenant_id: tenantId,
    source: i.source,
    source_record_id: i.sourceRecordId,
    headline: i.headline,
    kind: i.kind,
    tier: i.tier,
    lat: i.lat ?? null,
    lon: i.lon ?? null,
    occurred_at: i.occurredAt ?? null,
    published_at: i.publishedAt ?? null,
    victim_note: i.victimNote ?? null,
    corroborating: i.corroborating ?? [],
    note: i.note ?? null,
  }));
  const { error } = await sb
    .from("incidents")
    .upsert(rows, { onConflict: "tenant_id,source,source_record_id", ignoreDuplicates: false });
  if (error) {
    // relation-missing / not-configured → degrade rather than fail the poll
    return { persisted: 0, degraded: true, error: error.message };
  }
  return { persisted: rows.length, degraded: false };
}

/** Archive a full source snapshot. Dallas PD Active Calls keeps NO history —
 *  the feed is a live-only window — so every poll is archived verbatim to
 *  reconstruct history later. Graceful degrade like persistIncidents. */
export async function persistSnapshot(
  tenantSlug: string,
  source: string,
  payload: unknown[]
): Promise<{ archived: boolean; degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { archived: false, degraded: true };
  }
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return { archived: false, degraded: true };
  const { error } = await sb.from("dispatch_snapshots").insert({
    tenant_id: tenantId,
    source,
    captured_at: new Date().toISOString(),
    record_count: payload.length,
    payload,
  });
  return { archived: !error, degraded: !!error };
}

/** Append an audit event (STATUS/DELIVERY/ACTION/INGEST/MUTE). The audit
 *  log is append-only at the DB level; this only ever inserts. */
export async function logAuditEvent(
  tenantSlug: string,
  e: { type: string; event: string; evidence?: string; campusId?: string; statusColor?: Status }
): Promise<{ degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { degraded: true };
  }
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return { degraded: true };
  const { error } = await sb.from("audit_events").insert({
    tenant_id: tenantId,
    type: e.type,
    event: e.event,
    evidence: e.evidence ?? null,
    campus_id: e.campusId ?? null,
    status_color: e.statusColor ?? null,
  });
  return { degraded: !!error };
}

/** Record a notification held by a quiet window (v1.1). ALERT never lands
 *  here — it always breaks through. Also writes a DELIVERY audit row. */
export async function persistHeldDelivery(
  tenantSlug: string,
  h: {
    campusId: string;
    campusCode: string;
    incidentId?: string;
    status: Status; // MONITOR | ELEVATED
    windowKind: "arrival" | "dismissal";
    reason: string;
    releaseAt: string; // ISO
  }
): Promise<{ degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { degraded: true };
  }
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return { degraded: true };
  const { error } = await sb.from("held_deliveries").insert({
    tenant_id: tenantId,
    campus_id: h.campusId,
    incident_id: h.incidentId ?? null,
    status: h.status,
    window_kind: h.windowKind,
    reason: h.reason,
    release_at: h.releaseAt,
  });
  await logAuditEvent(tenantSlug, {
    type: "DELIVERY",
    event: `${h.campusCode} · ${h.status} notification HELD · ${h.windowKind} quiet window · releases ${h.releaseAt.slice(11, 16)}`,
    evidence: "quiet-windows v1.1",
    campusId: h.campusId,
    statusColor: h.status,
  });
  return { degraded: !!error };
}

/** Write/refresh a source_health row. Graceful degrade like persistIncidents. */
export async function persistHealth(
  tenantSlug: string,
  health: SourceHealth
): Promise<{ degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { degraded: true };
  }
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return { degraded: true };
  const { error } = await sb.from("source_health").upsert(
    {
      tenant_id: tenantId,
      key: health.key,
      label: health.label,
      age_label: health.ageLabel,
      expected_window: health.expectedWindow ?? null,
      in_window: health.inWindow,
      state: health.state,
      last_success_at: new Date().toISOString(),
      enabled: true,
    },
    { onConflict: "tenant_id,key" }
  );
  return { degraded: !!error };
}
