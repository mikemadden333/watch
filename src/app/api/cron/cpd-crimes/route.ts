/* Vercel cron — CPD Crimes poll (hourly). Chicago backfill/context
   layer. Persists only violent/weapon offenses inside a campus ring. */

import { NextResponse } from "next/server";
import { runCpdCrimesAdapter } from "@/lib/adapters/cpd-crimes";
import { attachGeometry, persistHealth, persistIncidents, validate } from "@/lib/adapters/contract";
import { adapterTenants } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out = [];
  for (const tenant of adapterTenants().filter((t) => t.city === "Chicago")) {
    const result = await runCpdCrimesAdapter(tenant.campuses);
    const geo = attachGeometry(result.incidents, tenant.campuses);
    const { ok, rejected } = validate(geo);
    const maxRing = tenant.campuses.reduce((m, c) => Math.max(m, c.elevatedRingMi), 0.5);
    const inScope = ok.filter((i) => i.distanceMi != null && i.distanceMi <= maxRing);
    const persisted = await persistIncidents(tenant.id, inScope);
    await persistHealth(tenant.id, result.health);
    out.push({
      tenant: tenant.name,
      fetched: result.fetched,
      inScope: inScope.length,
      rejected: rejected.length,
      persisted: persisted.persisted,
      degraded: persisted.degraded,
      health: result.health,
      errors: result.errors,
    });
  }
  return NextResponse.json({ source: "cpd-crimes", startedAt: new Date().toISOString(), tenants: out });
}
