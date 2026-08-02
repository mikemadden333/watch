/* Demo DRILL — insert a clearly-labeled SIMULATED shooting near a campus and
   run the real rules engine so posture escalates (and, if Twilio is set, a
   text fires). Everything is stamped "DRILL · simulated" so it can never be
   mistaken for real data, is excluded from the accuracy ledger, and is wiped
   by /api/demo/clear. For demonstrations only. */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { resolveTenantId, persistIncidents } from "@/lib/adapters/contract";
import { evaluateTenant } from "@/lib/statusEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CAMPUS: Record<string, string> = {
  "veritas-charter": "ENG",
  "solis-academies": "CVP",
};

export async function POST(req: Request) {
  // Gated so the public endpoint can't be abused (it inserts data and can
  // fire real texts). Enabled only when DEMO_MODE=1 is set in the environment.
  if (process.env.DEMO_MODE !== "1") {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }
  const { slug, campus } = (await req.json().catch(() => ({}))) as { slug?: string; campus?: string };
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  let sb;
  try { sb = getServiceClient(); } catch { return NextResponse.json({ error: "db unavailable" }, { status: 500 }); }
  const tid = await resolveTenantId(slug);
  if (!tid) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const { data: campuses } = await sb.from("campuses").select("code,name,lat,lon").eq("tenant_id", tid);
  if (!campuses?.length) return NextResponse.json({ error: "no campuses" }, { status: 404 });
  const target =
    campuses.find((c) => c.code === (campus || DEFAULT_CAMPUS[slug])) ?? campuses[0];

  // ~0.12 mi north of the campus — inside the 0.25 mi ALERT ring
  const lat = Number(target.lat) + 0.00174;
  const lon = Number(target.lon);
  const now = new Date();

  await persistIncidents(slug, [
    {
      source: "DRILL · simulated",
      sourceRecordId: `drill:${target.code}`,
      headline: `DRILL · simulated shooting · ${target.name}`,
      kind: "shooting",
      tier: "CONFIRMED",
      lat,
      lon,
      occurredAt: now.toISOString(),
      publishedAt: now.toISOString(),
      geoConfidence: "exact",
      note: "DEMO DRILL · simulated · not a real incident",
    },
  ]);

  const res = await evaluateTenant(slug, [], now);
  return NextResponse.json({
    ok: true,
    drill: true,
    campus: target.code,
    campusName: target.name,
    changes: res.changes,
  });
}
