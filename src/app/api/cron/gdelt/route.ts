/* Vercel cron — GDELT news corroboration (every 10 min). Free, no key.
   Per-tenant city query, throttled ≥5 s apart (GDELT policy). REPORTED
   network-scope signals; graceful degrade on throttle. */

import { NextResponse } from "next/server";
import { runGdeltAdapter } from "@/lib/adapters/gdelt";
import { persistHealth, persistIncidents, validate } from "@/lib/adapters/contract";
import { adapterTenants } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") === `Bearer ${secret}`;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out = [];
  const tenants = adapterTenants();
  for (let i = 0; i < tenants.length; i++) {
    if (i > 0) await sleep(5500); // GDELT: ≤1 request / 5 s
    const t = tenants[i];
    const result = await runGdeltAdapter(t.city);
    const { ok } = validate(result.incidents);
    const persisted = await persistIncidents(t.id, ok);
    await persistHealth(t.id, result.health);
    out.push({
      tenant: t.name,
      fetched: result.fetched,
      persisted: persisted.persisted,
      health: result.health.ageLabel,
      degraded: persisted.degraded,
      errors: result.errors,
    });
  }
  return NextResponse.json({ source: "gdelt", startedAt: new Date().toISOString(), tenants: out });
}
