/* Demo DRILL — insert clearly-labeled SIMULATED incidents near a campus and
   run the real rules engine so posture escalates (and, if Twilio is set, a
   text fires). Everything is stamped "DRILL · simulated" so it can never be
   mistaken for real data, is excluded from the accuracy ledger, and is wiped
   by /api/demo/clear. For demonstrations only.

   For Veritas → Garfield Park Academy, the drill fires the full V2 wireframe
   story beat for beat: a confirmed shooting 0.28 mi NE (→ ELEVATED, rule E-2)
   plus two older confirmed shootings so Pulse shows three fading rings. */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { resolveTenantId, persistIncidents } from "@/lib/adapters/contract";
import { evaluateTenant } from "@/lib/statusEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CAMPUS: Record<string, string> = {
  "veritas-charter": "GPA",
  "solis-academies": "CVP",
};

/** offset a lat/lon by a distance (mi) along a compass bearing (deg). */
function offset(lat: number, lon: number, distMi: number, bearingDeg: number) {
  const r = (bearingDeg * Math.PI) / 180;
  const dLat = (distMi * Math.cos(r)) / 69.0;
  const dLon = (distMi * Math.sin(r)) / (69.0 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lon: lon + dLon };
}

function centralYMD(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

type DrillIncident = Parameters<typeof persistIncidents>[1][number];

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "1") {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }
  const { slug, campus, alert } = (await req.json().catch(() => ({}))) as { slug?: string; campus?: string; alert?: boolean };
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  let sb;
  try { sb = getServiceClient(); } catch { return NextResponse.json({ error: "db unavailable" }, { status: 500 }); }
  const tid = await resolveTenantId(slug);
  if (!tid) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const { data: campuses } = await sb.from("campuses").select("code,name,lat,lon").eq("tenant_id", tid);
  if (!campuses?.length) return NextResponse.json({ error: "no campuses" }, { status: 404 });
  const wanted = campus || DEFAULT_CAMPUS[slug];
  const target = campuses.find((c) => c.code === wanted) ?? campuses[0];
  const tLat = Number(target.lat);
  const tLon = Number(target.lon);
  const now = new Date();

  let incidents: DrillIncident[];

  if (alert) {
    // ---- ALERT-tier drill: a confirmed incident INSIDE the 0.25 mi alert ring
    // (rule A-2) → posture escalates to ALERT → the SMS channel fires. This is
    // the path that sends a real text (ELEVATED sends push/email only). ----
    const p = offset(tLat, tLon, 0.15, 45);
    incidents = [
      {
        source: "DRILL · simulated", sourceRecordId: `drill:${target.code}:alert`,
        headline: `DRILL · near ${target.name}`, kind: "shooting", tier: "CONFIRMED",
        lat: p.lat, lon: p.lon, geoConfidence: "exact",
        occurredAt: now.toISOString(), publishedAt: now.toISOString(),
        victimNote: "one victim, non-fatal", note: "DEMO DRILL · simulated · not a real incident",
      },
    ];
  } else if (slug === "veritas-charter" && target.code === "GPA") {
    // ---- the Garfield Park Academy overnight story (wireframe, beat for beat) ----
    const today = centralYMD(now);
    const yest = centralYMD(new Date(now.getTime() - 86400000));
    const main = offset(tLat, tLon, 0.28, 45); // 0.28 mi NE → ELEVATED (E-2)
    const h34 = offset(tLat, tLon, 0.31, 270); // 34 d ago, 0.31 mi W
    const h96 = offset(tLat, tLon, 0.4, 135); // 96 d ago, 0.4 mi SE
    incidents = [
      {
        source: "DRILL · simulated", sourceRecordId: "drill:GPA:warren",
        headline: "DRILL · 2800 block W Warren Blvd", kind: "shooting", tier: "CONFIRMED",
        lat: main.lat, lon: main.lon, geoConfidence: "exact",
        occurredAt: `${yest}T23:47:00-05:00`, publishedAt: `${today}T06:40:00-05:00`,
        victimNote: "one victim, non-fatal", note: "DEMO DRILL · simulated · not a real incident",
      },
      {
        source: "DRILL · simulated (ME-matched)", sourceRecordId: "drill:GPA:madison",
        headline: "DRILL · W Madison St", kind: "shooting", tier: "CONFIRMED",
        lat: h34.lat, lon: h34.lon, geoConfidence: "exact",
        occurredAt: new Date(now.getTime() - 34 * 86400000).toISOString(),
        publishedAt: new Date(now.getTime() - 34 * 86400000 + 8 * 3600000).toISOString(),
        victimNote: "one victim, fatal", note: "DEMO DRILL · simulated · not a real incident",
      },
      {
        source: "DRILL · simulated", sourceRecordId: "drill:GPA:monroe",
        headline: "DRILL · W Monroe St", kind: "shooting", tier: "CONFIRMED",
        lat: h96.lat, lon: h96.lon, geoConfidence: "exact",
        occurredAt: new Date(now.getTime() - 96 * 86400000).toISOString(),
        publishedAt: new Date(now.getTime() - 96 * 86400000 + 8 * 3600000).toISOString(),
        victimNote: "one victim, non-fatal", note: "DEMO DRILL · simulated · not a real incident",
      },
    ];
  } else {
    // ---- generic single-campus drill: 0.35 mi → ELEVATED (E-2), visual only,
    // no text. The ⌃⇧A ALERT path is the one that pages. ----
    const p = offset(tLat, tLon, 0.35, 45);
    incidents = [
      {
        source: "DRILL · simulated", sourceRecordId: `drill:${target.code}`,
        headline: `DRILL · simulated shooting · ${target.name}`, kind: "shooting", tier: "CONFIRMED",
        lat: p.lat, lon: p.lon, geoConfidence: "exact",
        occurredAt: now.toISOString(), publishedAt: now.toISOString(),
        victimNote: "one victim, non-fatal",
        note: "DEMO DRILL · simulated · not a real incident",
      },
    ];
  }

  await persistIncidents(slug, incidents);
  const res = await evaluateTenant(slug, [], now);
  return NextResponse.json({ ok: true, drill: true, campus: target.code, campusName: target.name, seeded: incidents.length, changes: res.changes });
}
