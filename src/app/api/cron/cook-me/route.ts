/* Vercel cron — Cook County ME poll (every 6 h). Slow gun-related-death
   confirmation source. Date validation rejects future-dated typos. */

import { NextResponse } from "next/server";
import { runCookMeAdapter } from "@/lib/adapters/cook-me";
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
    const result = await runCookMeAdapter(tenant.campuses);
    const geo = attachGeometry(result.incidents, tenant.campuses);
    const { ok, rejected } = validate(geo); // rejects future-dated typos
    const maxRing = tenant.campuses.reduce((m, c) => Math.max(m, c.elevatedRingMi), 0.5);
    // ME rows may lack coords; persist those with coords in-ring, plus keep counts
    const inScope = ok.filter((i) => i.distanceMi == null || i.distanceMi <= maxRing);
    const persisted = await persistIncidents(tenant.id, inScope);
    await persistHealth(tenant.id, result.health);
    out.push({
      tenant: tenant.name,
      fetched: result.fetched,
      normalized: ok.length,
      rejectedFutureDated: rejected.length,
      persisted: persisted.persisted,
      degraded: persisted.degraded,
      health: result.health,
      errors: result.errors,
    });
  }
  return NextResponse.json({ source: "cook-me", startedAt: new Date().toISOString(), tenants: out });
}
