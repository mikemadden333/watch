/* Lean live-state snapshot for the in-app monitor to poll. Returns just
   enough to detect change and drive the arrival choreography — current
   per-campus status, worst posture, recent incidents, and feed health.
   Read through the same live network layer the pages use. */

import { NextResponse } from "next/server";
import { getNetworkData } from "@/lib/networkData";
import type { Status } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANK: Record<Status, number> = { ALERT: 3, ELEVATED: 2, MONITOR: 1, CLEAR: 0 };

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const data = await getNetworkData(slug);
  if (!data) return NextResponse.json({ live: false });

  let worst: Status = "CLEAR";
  for (const s of data.statuses) if (RANK[s.status] > RANK[worst]) worst = s.status;

  return NextResponse.json({
    live: true,
    at: new Date().toISOString(),
    worst,
    counts: data.counts,
    statuses: data.statuses.map((s) => ({
      c: s.campusCode,
      s: s.status,
      since: s.since,
      rule: s.ruleId ?? null,
      ruleName: s.ruleName ?? null,
      detail: s.detail ?? null,
      inc: s.incidentId ?? null,
    })),
    incidents: data.incidents.slice(0, 24).map((i) => ({
      id: i.id,
      tier: i.tier,
      kind: i.kind,
      headline: i.headline,
      dist: i.distanceMi ?? null,
      bearing: i.bearing ?? null,
      near: i.nearestCampusCode ?? null,
      geo: i.geoConfidence ?? null,
      occurred: i.occurredAt,
      published: i.publishedAt,
    })),
    feeds: data.feeds.map((f) => ({ k: f.key, label: f.label, state: f.state })),
  });
}
