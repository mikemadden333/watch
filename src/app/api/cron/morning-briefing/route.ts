/* ============================================================
   Vercel cron — 6:40 AM morning briefing (directive §7).
   The push subject line IS the sentence. Delivers in-app always
   (logged to Record); push/SMS respects routing + quiet windows.
   Schedule: 11:40 UTC weekdays ≈ 6:40 AM America/Chicago (CDT).
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
  const results = await runAll("morning", now);
  return NextResponse.json({ source: "morning-briefing", startedAt: now.toISOString(), results });
}
