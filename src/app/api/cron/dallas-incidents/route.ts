/* ============================================================
   Vercel cron — Dallas Police Incidents (qv6i-rri7), the CONFIRMED
   gun-violence record for Solis Academies (Dallas). Runs a few times a
   day: pulls the last 125 days of firearm-involved violent incidents
   near each campus and upserts them (idempotent on incident number).
   This is what populates the Dallas board / Pulse and arms the A-2 rule.
   ODC-BY: Contains information from Dallas OpenData.
   ============================================================ */

import { NextResponse } from "next/server";
import { runDallasIncidentsAdapter, DALLAS_INCIDENTS_ATTRIBUTION } from "@/lib/adapters/dallas-incidents";
import { attachGeometry, persistHealth, persistIncidents, validate } from "@/lib/adapters/contract";
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
  const result = await runDallasIncidentsAdapter(dallas.campuses);

  const withGeom = attachGeometry(result.incidents, dallas.campuses);
  const { ok } = validate(withGeom);
  const persisted = await persistIncidents(dallas.id, ok);
  await persistHealth(dallas.id, result.health);

  return NextResponse.json({
    source: "dallas-incidents",
    startedAt,
    attribution: DALLAS_INCIDENTS_ATTRIBUTION,
    tenant: dallas.name,
    fetched: result.fetched,
    persisted: persisted.persisted,
    degraded: persisted.degraded,
    health: result.health,
    errors: result.errors,
  });
}
