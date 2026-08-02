/* ============================================================
   Vercel cron — status evaluation (every 2 min)
   Runs the rules engine against the live incident store per tenant,
   folding in fresh NWS weather signals, and persists any status
   change (history + audit + resolution/quiet-window delivery).
   This is what makes live data drive live posture.
   ============================================================ */

import { NextResponse } from "next/server";
import { runNwsAdapter } from "@/lib/adapters/nws";
import { adapterTenants } from "@/lib/adapters/registry";
import { evaluateTenant } from "@/lib/statusEngine";
import type { WeatherSignal } from "@/lib/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const out = [];
  for (const tenant of adapterTenants()) {
    // fresh NWS warning/watch signals, tagged by campus code
    const nws = await runNwsAdapter(tenant.campuses);
    const weather: (WeatherSignal & { campusCode: string })[] = nws.weatherSignals.map((s) => ({
      kind: s.kind,
      intersectsCampus: true,
      expiresAt: s.expiresAt,
      campusCode: s.campusCode,
    }));
    const res = await evaluateTenant(tenant.id, weather, now);
    out.push({
      tenant: tenant.name,
      evaluated: res.evaluated,
      changes: res.changes,
      degraded: res.degraded,
    });
  }
  return NextResponse.json({ source: "evaluate", startedAt: now.toISOString(), tenants: out });
}
