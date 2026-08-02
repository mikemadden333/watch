import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/adapters/contract";

/* Logs a comms-draft copy to Record (directive §5). Watch never sends —
   this only records that the leader copied a draft to their own system. */

export async function POST(req: Request) {
  let body: { slug?: string; audience?: string; incidentId?: string | null; campusCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const { slug, audience, incidentId, campusCode } = body;
  if (!slug || !audience) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  const tag = [campusCode, incidentId].filter(Boolean).join(" · ");
  const res = await logAuditEvent(slug, {
    type: "ACTION",
    event: `comms draft copied · ${audience}${tag ? " · " + tag : ""}`,
    evidence: "Act tab · nothing sent from Watch",
  });
  return NextResponse.json({ ok: !res.degraded });
}
