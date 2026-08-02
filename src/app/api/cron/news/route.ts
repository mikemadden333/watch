/* Vercel cron — licensed news (every 10 min). Dark until NEWSAPI_KEY is
   set; until then it reports "OFF · not contracted" per tenant. */

import { NextResponse } from "next/server";
import { runNewsAdapter } from "@/lib/adapters/news";
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
    const result = await runNewsAdapter(t.city);
    const { ok } = validate(result.incidents);
    const persisted = await persistIncidents(t.id, ok);
    await persistHealth(t.id, result.health);
    out.push({ tenant: t.name, contracted: result.fetched > 0 || result.health.state === "ok", fetched: result.fetched, persisted: persisted.persisted, health: result.health.ageLabel });
  }
  return NextResponse.json({ source: "news", startedAt: new Date().toISOString(), tenants: out });
}
