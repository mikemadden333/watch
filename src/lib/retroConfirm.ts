/* ============================================================
   Watch — retro-confirmation matcher (SERVER ONLY)
   Scores every fast-layer signal against the authoritative record
   once it lands. A CORROBORATED/REPORTED signal that a CONFIRMED
   record later matches (within a small radius and time window) is
   marked confirmed; the corroborated→confirmed rate and the median
   detect→confirm gap are written to the accuracy ledger.
   ============================================================ */

import { getServiceClient } from "./supabase";
import { resolveTenantId } from "./adapters/contract";
import { distanceMi } from "./geo";

const MATCH_RADIUS_MI = 0.5; // report-to-record geocoding error spans a few blocks
const MATCH_WINDOW_H = 48;
const MATURE_H = 12; // a fast signal needs this long before it counts against the rate

interface Row {
  id: string;
  tier: string;
  kind: string;
  lat: number | null;
  lon: number | null;
  occurred_at: string | null;
  published_at: string | null;
  detected_at: string | null;
  retro_confirmed_by: string | null;
}

const FAST = new Set(["CORROBORATED", "REPORTED"]);
const VIOLENT = /shoot|shots|homicide|dispatch|violence|robbery/i;

export async function runRetroConfirm(
  tenantSlug: string,
  now: Date = new Date()
): Promise<{ newMatches: number; rate: number | null; medianGapH: number | null; degraded: boolean }> {
  let sb;
  try {
    sb = getServiceClient();
  } catch {
    return { newMatches: 0, rate: null, medianGapH: null, degraded: true };
  }
  const tid = await resolveTenantId(tenantSlug);
  if (!tid) return { newMatches: 0, rate: null, medianGapH: null, degraded: true };

  const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await sb
    .from("incidents")
    .select("id,tier,kind,lat,lon,occurred_at,published_at,detected_at,retro_confirmed_by")
    .eq("tenant_id", tid)
    .gte("occurred_at", since);
  const rows = (data ?? []) as Row[];

  const confirmed = rows.filter(
    (r) => r.tier === "CONFIRMED" && r.lat != null && r.lon != null && r.occurred_at
  );
  const fast = rows.filter(
    (r) => FAST.has(r.tier) && r.lat != null && r.lon != null && r.occurred_at && VIOLENT.test(r.kind)
  );

  const matchedIds = new Set(fast.filter((f) => f.retro_confirmed_by).map((f) => f.id));
  let newMatches = 0;
  for (const f of fast) {
    if (f.retro_confirmed_by) continue;
    let best: Row | null = null;
    let bestD = Infinity;
    for (const c of confirmed) {
      if (c.id === f.id) continue;
      const d = distanceMi({ lat: f.lat!, lon: f.lon! }, { lat: c.lat!, lon: c.lon! });
      const gapH = Math.abs(new Date(c.occurred_at!).getTime() - new Date(f.occurred_at!).getTime()) / 3.6e6;
      if (d <= MATCH_RADIUS_MI && gapH <= MATCH_WINDOW_H && d < bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best) {
      const gapH =
        (new Date(best.published_at ?? best.occurred_at!).getTime() -
          new Date(f.detected_at ?? f.occurred_at!).getTime()) /
        3.6e6;
      await sb
        .from("incidents")
        .update({
          retro_confirmed_by: best.id,
          retro_confirmed_at: now.toISOString(),
          retro_gap_hours: Math.round(gapH * 10) / 10,
          retro_distance_mi: Math.round(bestD * 100) / 100,
        })
        .eq("id", f.id);
      matchedIds.add(f.id);
      newMatches++;
    }
  }

  // recompute ledger over matured fast signals
  const matured = fast.filter(
    (f) => (now.getTime() - new Date(f.detected_at ?? f.occurred_at!).getTime()) / 3.6e6 >= MATURE_H
  );
  const confirmedCount = matured.filter((f) => matchedIds.has(f.id)).length;
  const rate = matured.length ? Math.round((confirmedCount / matured.length) * 100) : null;

  const { data: gaps } = await sb
    .from("incidents")
    .select("retro_gap_hours")
    .eq("tenant_id", tid)
    .not("retro_gap_hours", "is", null);
  const gapVals = (gaps ?? []).map((g) => Number(g.retro_gap_hours)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const medianGapH = gapVals.length ? gapVals[Math.floor(gapVals.length / 2)] : null;

  // publish to the ledger
  if (rate != null) {
    await upsertLedger(sb, tid, {
      metric_key: "corroborated_to_confirmed",
      label: "Corroborated → confirmed",
      value: `${rate}%`,
      pct: rate,
      window_note: `${confirmedCount} of ${matured.length} · trailing 30 d`,
    });
  }
  if (medianGapH != null) {
    await upsertLedger(sb, tid, {
      metric_key: "median_detect_confirm_gap",
      label: "Median detect → confirm gap",
      value: `${medianGapH.toFixed(1)} h`,
      pct: Math.max(6, Math.min(100, 100 - medianGapH)),
      window_note: "fast layer leads the record",
    });
  }

  return { newMatches, rate, medianGapH, degraded: false };
}

async function upsertLedger(
  sb: ReturnType<typeof getServiceClient>,
  tid: string,
  m: { metric_key: string; label: string; value: string; pct: number; window_note: string }
) {
  // delete-then-insert keeps one row per metric_key per tenant
  await sb.from("accuracy_ledger").delete().eq("tenant_id", tid).eq("metric_key", m.metric_key);
  await sb.from("accuracy_ledger").insert({ tenant_id: tid, ...m });
}
