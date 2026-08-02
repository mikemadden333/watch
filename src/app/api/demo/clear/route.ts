/* Demo DRILL clear — remove all simulated DRILL incidents for a tenant and
   re-evaluate so posture returns to its real state (a resolution message
   fires on de-escalation). Undoes /api/demo/incident. */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { resolveTenantId } from "@/lib/adapters/contract";
import { evaluateTenant } from "@/lib/statusEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "1") {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  let sb;
  try { sb = getServiceClient(); } catch { return NextResponse.json({ error: "db unavailable" }, { status: 500 }); }
  const tid = await resolveTenantId(slug);
  if (!tid) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  // clear FK references, then delete the drill incidents
  const { data: drills } = await sb.from("incidents").select("id").eq("tenant_id", tid).like("source", "DRILL%");
  const ids = (drills ?? []).map((d) => d.id);
  if (ids.length) {
    await sb.from("campus_status").update({ incident_id: null }).eq("tenant_id", tid).in("incident_id", ids);
    await sb.from("campus_status_history").delete().eq("tenant_id", tid).in("incident_id", ids);
    await sb.from("incidents").delete().eq("tenant_id", tid).in("id", ids);
  }

  const res = await evaluateTenant(slug, [], new Date());
  return NextResponse.json({ ok: true, cleared: ids.length, changes: res.changes });
}
