/* Vercel cron — retro-confirmation matcher (every 30 min). Scores the
   fast layer against the authoritative record and updates the accuracy
   ledger per tenant. */

import { NextResponse } from "next/server";
import { adapterTenants } from "@/lib/adapters/registry";
import { runRetroConfirm } from "@/lib/retroConfirm";

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
  for (const t of adapterTenants()) {
    const r = await runRetroConfirm(t.id, now);
    out.push({ tenant: t.name, newMatches: r.newMatches, rate: r.rate, medianGapH: r.medianGapH, degraded: r.degraded });
  }
  return NextResponse.json({ source: "retro-confirm", startedAt: now.toISOString(), tenants: out });
}
