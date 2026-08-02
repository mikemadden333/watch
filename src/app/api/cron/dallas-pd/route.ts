/* ============================================================
   Vercel cron endpoint — Dallas PD Active Calls (every 2 min)
   Archives the full snapshot verbatim (the feed keeps no history),
   then upserts safety-relevant dispatch calls (REPORTED tier).
   Solis Academies (Dallas) only. Graceful degrade.
   ODC-BY: Contains information from Dallas OpenData.
   ============================================================ */

import { NextResponse } from "next/server";
import { runDallasPdAdapter, DALLAS_ATTRIBUTION } from "@/lib/adapters/dallas-pd";
import { attachGeometry, persistHealth, persistIncidents, persistSnapshot, validate } from "@/lib/adapters/contract";
import { geocodePending } from "@/lib/adapters/geocode";
import { adapterTenants } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dallas = adapterTenants().find((t) => t.city === "Dallas");
  if (!dallas) return NextResponse.json({ error: "no Dallas tenant" }, { status: 404 });

  const startedAt = new Date().toISOString();
  const { result, snapshot } = await runDallasPdAdapter();

  // 1) archive every poll — the feed has no history of its own
  const archive = await persistSnapshot(dallas.id, result.source, snapshot);
  // 2) geocode dispatch addresses → campus-ring geometry
  const geo = await geocodePending(result.incidents);
  const withGeom = attachGeometry(result.incidents, dallas.campuses);
  // 3) upsert safety-relevant dispatch calls (idempotent on incident_number)
  const { ok } = validate(withGeom);
  const persisted = await persistIncidents(dallas.id, ok);
  await persistHealth(dallas.id, result.health);

  return NextResponse.json({
    source: "dallas-pd",
    startedAt,
    attribution: DALLAS_ATTRIBUTION,
    tenant: dallas.name,
    fetched: result.fetched,
    archived: archive.archived,
    geocoded: geo.geocoded,
    safetyRelevant: ok.length,
    persisted: persisted.persisted,
    degraded: archive.degraded || persisted.degraded,
    health: result.health,
    errors: result.errors,
    note: archive.degraded ? "supabase schema not applied — snapshot not archived" : undefined,
  });
}
