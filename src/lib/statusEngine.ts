/* ============================================================
   Watch — live status engine (SERVER ONLY)
   Runs the deterministic rules against the live incident store and
   persists any status change: campus_status + campus_status_history
   + an append-only STATUS audit row. On de-escalation it fires the
   v1.1 resolution message; on escalation it applies the v1.1
   quiet-window delivery decision. This is what makes live data drive
   live posture.
   ============================================================ */

import { getServiceClient } from "./supabase";
import { resolveTenantId, logAuditEvent, persistHeldDelivery } from "./adapters/contract";
import { evaluateCampus, RULES_VERSION, type RuleIncident, type WeatherSignal } from "./rules";
import { decideDelivery, DEFAULT_QUIET, type QuietWindowConfig } from "./delivery";
import { buildResolutionHeadline } from "./resolution";
import type { Status } from "./types";

interface EngineCampus {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  alertRingMi: number;
  elevatedRingMi: number;
  quiet: QuietWindowConfig;
}

export interface StatusChange {
  campus: string;
  from: Status;
  to: Status;
  ruleId: string | null;
  delivery: string;
}

export async function evaluateTenant(
  tenantSlug: string,
  weatherSignals: WeatherSignal[],
  now: Date = new Date()
): Promise<{ changes: StatusChange[]; evaluated: number; degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { changes: [], evaluated: 0, degraded: true };
  }
  const tid = await resolveTenantId(tenantSlug);
  if (!tid) return { changes: [], evaluated: 0, degraded: true };

  const [campusRes, statusRes, incRes] = await Promise.all([
    sb.from("campuses").select("*").eq("tenant_id", tid),
    sb.from("campus_status").select("*").eq("tenant_id", tid),
    sb
      .from("incidents")
      .select("id,kind,tier,lat,lon,occurred_at,published_at,corroborating,geo_confidence")
      .eq("tenant_id", tid)
      .gte("occurred_at", new Date(now.getTime() - 48 * 3600 * 1000).toISOString()),
  ]);

  const campuses: EngineCampus[] = (campusRes.data ?? []).map((c) => ({
    id: String(c.id),
    code: String(c.code),
    name: String(c.name),
    lat: Number(c.lat),
    lon: Number(c.lon),
    alertRingMi: Number(c.alert_ring_mi ?? 0.25),
    elevatedRingMi: Number(c.elevated_ring_mi ?? 0.5),
    quiet: {
      quietWindowsEnabled: c.quiet_windows_enabled == null ? true : Boolean(c.quiet_windows_enabled),
      arrivalStart: String(c.arrival_start ?? DEFAULT_QUIET.arrivalStart),
      arrivalEnd: String(c.arrival_end ?? DEFAULT_QUIET.arrivalEnd),
      dismissalStart: String(c.dismissal_start ?? DEFAULT_QUIET.dismissalStart),
      dismissalEnd: String(c.dismissal_end ?? DEFAULT_QUIET.dismissalEnd),
    },
  }));
  const currentByCampus = new Map<string, Record<string, unknown>>();
  for (const s of statusRes.data ?? []) currentByCampus.set(String(s.campus_id), s);

  const ruleIncidents: RuleIncident[] = (incRes.data ?? [])
    .filter((i) => i.lat != null && i.lon != null)
    .map((i) => {
      const outlets = Array.isArray(i.corroborating) ? i.corroborating.length : 0;
      return {
        id: String(i.id),
        kind: String(i.kind),
        tier: i.tier as RuleIncident["tier"],
        lat: Number(i.lat),
        lon: Number(i.lon),
        occurredAt: String(i.occurred_at ?? i.published_at ?? ""),
        publishedAt: String(i.published_at ?? i.occurred_at ?? ""),
        outletCount: outlets || (i.tier === "CORROBORATED" ? 2 : 1),
        corroborationSpreadMin: 10,
        geoConfidence: (i.geo_confidence as RuleIncident["geoConfidence"]) ?? "exact",
      };
    });

  // latest data day = most recent published CONFIRMED record's date
  const latestDataDay =
    (incRes.data ?? [])
      .filter((i) => i.tier === "CONFIRMED" && i.published_at)
      .map((i) => String(i.published_at).slice(0, 10))
      .sort()
      .at(-1) ?? now.toISOString().slice(0, 10);

  const changes: StatusChange[] = [];

  for (const c of campuses) {
    const campusWeather: WeatherSignal[] = weatherSignals.filter(
      (w) => (w as WeatherSignal & { campusCode?: string }).campusCode === c.code || !("campusCode" in w)
    );
    const r = evaluateCampus({
      campus: { lat: c.lat, lon: c.lon },
      incidents: ruleIncidents,
      weather: campusWeather,
      now,
      latestDataDay,
      thresholds: { elevatedRingMi: c.elevatedRingMi, alertRingMi: c.alertRingMi },
    });

    const cur = currentByCampus.get(c.id);
    const from = (cur?.status as Status) ?? "CLEAR";
    if (r.status === from) continue;

    // 1) current status
    await sb.from("campus_status").upsert(
      {
        campus_id: c.id,
        tenant_id: tid,
        status: r.status,
        rule_id: r.ruleId,
        rule_name: r.ruleName,
        rules_version: RULES_VERSION,
        incident_id: r.incidentId ?? null,
        detail: r.detail,
        since: now.toISOString(),
      },
      { onConflict: "campus_id" }
    );
    // 2) history
    await sb.from("campus_status_history").insert({
      campus_id: c.id,
      tenant_id: tid,
      from_status: from,
      to_status: r.status,
      rule_id: r.ruleId,
      rule_name: r.ruleName,
      rules_version: RULES_VERSION,
      incident_id: r.incidentId ?? null,
    });
    // 3) STATUS audit
    await logAuditEvent(tenantSlug, {
      type: "STATUS",
      event: `${c.code} · ${from} → ${r.status}${r.ruleId ? ` · rule ${r.ruleId} · ${r.ruleName}` : ""} · ${r.detail}`,
      evidence: `${r.incidentId ? "incident " + r.incidentId + " · " : ""}rules ${RULES_VERSION}`,
      campusId: c.id,
      statusColor: r.status,
    });

    // 4) delivery / resolution
    let deliveryLabel: string;
    if (r.status === "CLEAR") {
      const msg = buildResolutionHeadline({
        campusName: c.name,
        fromStatus: from,
        reason: "ring clear + window expiry",
        resolvedLabel: hm(now),
      });
      await logAuditEvent(tenantSlug, {
        type: "DELIVERY",
        event: `Resolution · ${msg}`,
        evidence: "resolution v1.1 · template-filled",
        campusId: c.id,
      });
      deliveryLabel = "resolution sent";
    } else {
      const decision = decideDelivery(r.status, c.quiet, now);
      if (decision.action === "hold") {
        await persistHeldDelivery(tenantSlug, {
          campusId: c.id,
          campusCode: c.code,
          incidentId: r.incidentId,
          status: r.status,
          windowKind: decision.windowKind!,
          reason: decision.reason,
          releaseAt: releaseIso(now, decision.releaseAtLocal!),
        });
        deliveryLabel = `held · ${decision.windowKind} window`;
      } else {
        await logAuditEvent(tenantSlug, {
          type: "DELIVERY",
          event: `${c.code} · ${r.status} · ${decision.reason}`,
          evidence: "delivery v1.1",
          campusId: c.id,
          statusColor: r.status,
        });
        deliveryLabel = decision.action === "in-app" ? "in-app only" : decision.channels.join(" + ");
      }
    }

    changes.push({ campus: c.code, from, to: r.status, ruleId: r.ruleId, delivery: deliveryLabel });
  }

  return { changes, evaluated: campuses.length, degraded: false };
}

function hm(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function releaseIso(now: Date, localHHMM: string): string {
  // approximate: today at the window-end local time, expressed as ISO
  const [h, m] = localHHMM.split(":").map(Number);
  const d = new Date(now);
  d.setUTCHours(h + 5, m, 0, 0); // Central ≈ UTC-5 (CDT); demo-grade
  return d.toISOString();
}
