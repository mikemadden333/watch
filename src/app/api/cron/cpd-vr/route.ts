/* ============================================================
   Vercel cron endpoint — CPD Violence Reduction poll (every 30 min)
   Chicago-only confirmation layer. Freshness uses ordered-desc-limit-1
   (never aggregate). Idempotent upsert on unique_id; graceful degrade.
   ============================================================ */

import { NextResponse } from "next/server";
import { runCpdVrAdapter } from "@/lib/adapters/cpd-vr";
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

  const startedAt = new Date().toISOString();
  const out = [];
  for (const tenant of adapterTenants().filter((t) => t.city === "Chicago")) {
    const result = await runCpdVrAdapter(tenant.campuses);
    const withGeo = attachGeometry(result.incidents, tenant.campuses);
    const { ok, rejected } = validate(withGeo);
    // only persist incidents inside a campus's elevated ring — the rest is logged context
    const inScope = ok.filter(
      (i) => i.distanceMi != null && i.distanceMi <= maxElevatedRing(tenant.campuses)
    );
    const persisted = await persistIncidents(tenant.id, inScope);
    await persistHealth(tenant.id, result.health);
    out.push({
      tenant: tenant.name,
      fetched: result.fetched,
      normalized: ok.length,
      inScope: inScope.length,
      rejected: rejected.length,
      persisted: persisted.persisted,
      degraded: persisted.degraded,
      health: result.health,
      errors: result.errors,
      note: persisted.degraded ? "supabase schema not applied — not persisted" : undefined,
    });
  }
  return NextResponse.json({ source: "cpd-vr", startedAt, tenants: out });
}

function maxElevatedRing(campuses: { elevatedRingMi: number }[]): number {
  return campuses.reduce((m, c) => Math.max(m, c.elevatedRingMi), 0.5);
}
