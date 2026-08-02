/* ============================================================
   Vercel cron endpoint — NWS poll (every 2 min)
   Runs the NWS adapter for every tenant, attaches geometry,
   validates, and idempotently upserts. Degrades gracefully when
   Supabase isn't configured (returns the normalized payload so the
   poll is still observable). Protected by CRON_SECRET when set.
   ============================================================ */

import { NextResponse } from "next/server";
import { runNwsAdapter } from "@/lib/adapters/nws";
import {
  attachGeometry,
  persistHealth,
  persistIncidents,
  validate,
} from "@/lib/adapters/contract";
import { adapterTenants } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (demo)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const perTenant = [];

  for (const tenant of adapterTenants()) {
    const result = await runNwsAdapter(tenant.campuses);
    const withGeo = attachGeometry(result.incidents, tenant.campuses);
    const { ok, rejected } = validate(withGeo);
    const persisted = await persistIncidents(tenant.id, ok);
    await persistHealth(tenant.id, result.health);

    perTenant.push({
      tenant: tenant.name,
      fetched: result.fetched,
      normalized: ok.length,
      rejected: rejected.length,
      persisted: persisted.persisted,
      degraded: persisted.degraded,
      health: result.health,
      weatherSignals: result.weatherSignals,
      errors: result.errors,
      note: persisted.degraded
        ? "supabase not configured or schema not applied — data not persisted"
        : undefined,
    });
  }

  return NextResponse.json({ source: "nws", startedAt, tenants: perTenant });
}
