/* Vercel cron — local-news intelligence (every 10 min). Free. Fetches
   local newsroom RSS, extracts violent-incident signals, clusters them
   across outlets into corroboration-scored events, geocodes block cues
   (Census) or falls back to neighborhood centroids, and persists them as
   REPORTED/CORROBORATED incidents carrying geoConfidence. Coarse-geo
   events are stored for briefing context but can never trigger a ring. */

import { NextResponse } from "next/server";
import { runLocalNewsAdapter } from "@/lib/adapters/localnews";
import { persistHealth, persistIncidents, validate } from "@/lib/adapters/contract";
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
  for (const t of adapterTenants()) {
    const result = await runLocalNewsAdapter(t.city);
    const { ok } = validate(result.incidents);
    const persisted = await persistIncidents(t.id, ok);
    await persistHealth(t.id, result.health);
    out.push({
      tenant: t.name,
      fetched: result.fetched,
      events: result.incidents.length,
      corroborated: result.incidents.filter((i) => i.tier === "CORROBORATED").length,
      persisted: persisted.persisted,
      health: result.health.ageLabel,
      errors: result.errors,
    });
  }
  return NextResponse.json({ source: "localnews", startedAt: new Date().toISOString(), tenants: out });
}
