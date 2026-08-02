/* ============================================================
   Vercel cron — 2:15 PM dismissal outlook (directive §7).
   Composes the per-tenant outlook sentence and delivers it in-app
   (logged to Record); push/SMS respects ELEVATED-tier routing and
   quiet-window inhibition. The sentence is deterministic.
   Schedule: 19:15 UTC weekdays ≈ 2:15 PM America/Chicago (CDT).
   ============================================================ */

import { NextResponse } from "next/server";
import { runAll } from "@/lib/scheduledNotices";

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
  const results = await runAll("dismissal", now);
  return NextResponse.json({ source: "dismissal-outlook", startedAt: now.toISOString(), results });
}
